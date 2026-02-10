"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { updateProfilePhone, syncPhoneVerifiedFromAuth } from "@/lib/actions/profile";

const PHONE_VERIFICATION_ENABLED =
  process.env.NEXT_PUBLIC_PHONE_VERIFICATION_ENABLED === "true";

type PhoneVerificationSectionProps = {
  initialPhone: string | null;
  initialShowPhoneOnListing: boolean;
  initialPhoneVerified: boolean;
};

export function PhoneVerificationSection({
  initialPhone,
  initialShowPhoneOnListing,
  initialPhoneVerified,
}: PhoneVerificationSectionProps) {
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [showPhoneOnListing, setShowPhoneOnListing] = useState(
    initialShowPhoneOnListing
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const [otpStep, setOtpStep] = useState<"idle" | "sent" | "verifying">("idle");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const router = useRouter();

  const handleSavePhoneAndPreferences = async () => {
    setSaveStatus("loading");
    setSaveError(null);
    const result = await updateProfilePhone(
      phone.trim() || null,
      showPhoneOnListing
    );
    setSaveStatus(result.ok ? "success" : "error");
    if (!result.ok) setSaveError(result.error);
  };

  const handleSendOtp = async () => {
    const raw = phone.trim();
    if (!raw) return;
    const normalized = raw.startsWith("+") ? raw : `+421${raw.replace(/\D/g, "")}`;
    if (normalized.length < 10) {
      setOtpError("Zadajte platné číslo (napr. 901 234 567 alebo +421901234567)");
      return;
    }
    setOtpError(null);
    setOtpStep("sent");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ phone: normalized });
    if (error) {
      setOtpError(error.message);
      setOtpStep("idle");
      return;
    }
    setOtpCode("");
  };

  const handleVerifyOtp = async () => {
    const raw = phone.trim();
    const normalized = raw.startsWith("+") ? raw : `+421${raw.replace(/\D/g, "")}`;
    if (!otpCode.trim() || otpCode.trim().length < 4) {
      setOtpError("Zadajte kód z SMS");
      return;
    }
    setOtpError(null);
    setOtpStep("verifying");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.verifyOtp({
      phone: normalized,
      token: otpCode.trim(),
      type: "phone_change",
    });
    if (error) {
      setOtpError(error.message);
      setOtpStep("sent");
      return;
    }
    const sync = await syncPhoneVerifiedFromAuth();
    setOtpStep("idle");
    setOtpCode("");
    if (sync.ok) {
      setSaveStatus("success");
      setSaveError(null);
      router.refresh();
    } else {
      setOtpError(sync.error);
      setOtpStep("sent");
    }
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Smartphone className="text-muted-foreground size-5" aria-hidden />
        <h2 className="text-sm font-semibold">Telefón a overenie</h2>
        {initialPhoneVerified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            <ShieldCheck className="size-3" aria-hidden />
            Overené
          </span>
        )}
      </div>

      {!PHONE_VERIFICATION_ENABLED && (
        <p className="text-muted-foreground text-sm">
          Overenie telefónu vyžaduje nastavenie SMS poskytovateľa (Supabase Auth).
          Číslo si môžete uložiť; po zapnutí overenia ho budete môcť overiť OTP.
        </p>
      )}

      <div className="grid gap-2">
        <label htmlFor="me-phone" className="text-sm font-medium">
          Telefónne číslo
        </label>
        <Input
          id="me-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+421 901 234 567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-describedby="me-phone-hint"
          className="max-w-[280px]"
        />
        <p id="me-phone-hint" className="text-muted-foreground text-xs">
          Formát: +421901234567 alebo 901 234 567
        </p>
      </div>

      {PHONE_VERIFICATION_ENABLED && !initialPhoneVerified && phone.trim() && (
        <div className="space-y-2">
          {otpStep === "idle" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSendOtp}
              aria-label="Odoslať overovací kód na telefón"
            >
              Odoslať overovací kód
            </Button>
          )}
          {(otpStep === "sent" || otpStep === "verifying") && (
            <div className="flex flex-col gap-2">
              <label htmlFor="me-otp" className="text-sm font-medium">
                Kód z SMS
              </label>
              <div className="flex gap-2">
                <Input
                  id="me-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  className="max-w-[120px]"
                  aria-invalid={!!otpError}
                  aria-describedby={otpError ? "me-otp-error" : undefined}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleVerifyOtp}
                  disabled={otpStep === "verifying"}
                  aria-label="Overiť kód"
                >
                  {otpStep === "verifying" ? "Overujem…" : "Overiť"}
                </Button>
              </div>
              {otpError && (
                <p id="me-otp-error" className="text-destructive text-sm" role="alert">
                  {otpError}
                </p>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOtpStep("idle");
                  setOtpCode("");
                  setOtpError(null);
                }}
              >
                Zrušiť
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id="me-show-phone"
          checked={showPhoneOnListing}
          onChange={(e) => setShowPhoneOnListing(e.target.checked)}
          aria-describedby="me-show-phone-hint"
          className="border-input mt-1 size-4 shrink-0 rounded border accent-primary"
        />
        <div className="grid gap-0.5">
          <label
            htmlFor="me-show-phone"
            className="cursor-pointer text-sm font-normal"
          >
            Zobrazovať telefón na inzerátoch
          </label>
          <p id="me-show-phone-hint" className="text-muted-foreground text-xs">
            {initialPhoneVerified
              ? "Kupujúci uvidia vaše číslo na stránke inzerátu."
              : "Bude zobrazené až po overení čísla."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleSavePhoneAndPreferences}
          disabled={saveStatus === "loading"}
          aria-busy={saveStatus === "loading"}
        >
          {saveStatus === "loading" ? "Ukladám…" : "Uložiť číslo a nastavenia"}
        </Button>
        {saveStatus === "success" && (
          <span className="text-muted-foreground text-sm">Uložené</span>
        )}
        {saveStatus === "error" && saveError && (
          <span className="text-destructive text-sm" role="alert">
            {saveError}
          </span>
        )}
      </div>
    </div>
  );
}
