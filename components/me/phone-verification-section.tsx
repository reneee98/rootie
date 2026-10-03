"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { updateProfilePhone, syncPhoneVerifiedFromAuth } from "@/lib/actions/profile";
import { normalizePhone } from "@/lib/phone";

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

  const [otpStep, setOtpStep] = useState<"idle" | "sending" | "sent" | "verifying">("idle");
  const [otpPhone, setOtpPhone] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const router = useRouter();
  const phoneVerified = initialPhoneVerified && normalizePhone(phone) !== null &&
    normalizePhone(phone) === normalizePhone(initialPhone);

  const handleSavePhoneAndPreferences = async () => {
    setSaveStatus("loading");
    setSaveError(null);
    try {
      const result = await updateProfilePhone(phone.trim() || null, showPhoneOnListing);
      setSaveStatus(result.ok ? "success" : "error");
      if (!result.ok) setSaveError(result.error);
      else router.refresh();
    } catch {
      setSaveStatus("error");
      setSaveError("Číslo sa nepodarilo uložiť. Skúste to znova.");
    }
  };

  const handleSendOtp = async () => {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setOtpError("Zadajte platné číslo (napr. 901 234 567 alebo +421901234567)");
      return;
    }
    setOtpError(null);
    setOtpStep("sending");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ phone: normalized });
      if (error) {
        setOtpError(error.message);
        setOtpStep("idle");
        return;
      }
      setOtpPhone(normalized);
      setOtpCode("");
      setOtpStep("sent");
    } catch {
      setOtpError("Overovací kód sa nepodarilo odoslať. Skúste to znova.");
      setOtpStep("idle");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpPhone || !/^\d{6}$/.test(otpCode.trim())) {
      setOtpError("Zadajte kód z SMS");
      return;
    }
    setOtpError(null);
    setOtpStep("verifying");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.verifyOtp({
        phone: otpPhone,
        token: otpCode.trim(),
        type: "phone_change",
      });
      if (error) {
        setOtpError(error.message);
        setOtpStep("sent");
        return;
      }
      const sync = await syncPhoneVerifiedFromAuth();
      if (sync.ok) {
        setPhone(otpPhone);
        setOtpStep("idle");
        setOtpCode("");
        setSaveStatus("success");
        setSaveError(null);
        router.refresh();
      } else {
        setOtpError(sync.error);
        setOtpStep("idle");
      }
    } catch {
      setOtpError("Overenie sa nepodarilo. Skúste to znova.");
      setOtpStep("sent");
    }
  };

  return (
    <div className="rootie-surface space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Smartphone className="text-muted-foreground size-5" aria-hidden />
        <h2 className="text-sm font-semibold">Telefón a overenie</h2>
        {phoneVerified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            <ShieldCheck className="size-3" aria-hidden />
            Overené
          </span>
        )}
      </div>

      {!PHONE_VERIFICATION_ENABLED && (
        <p className="text-muted-foreground text-sm">
          Overenie cez SMS momentálne nie je dostupné. Číslo si môžete uložiť;
          na inzerátoch sa zobrazí až po overení.
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
          onChange={(e) => {
            setPhone(e.target.value);
            setSaveStatus("idle");
            setOtpError(null);
          }}
          disabled={otpStep !== "idle" || saveStatus === "loading"}
          aria-describedby="me-phone-hint"
          className="max-w-[280px]"
        />
        <p id="me-phone-hint" className="text-muted-foreground text-xs">
          Formát: +421901234567 alebo 901 234 567
        </p>
      </div>

      {PHONE_VERIFICATION_ENABLED && !phoneVerified && phone.trim() && (
        <div className="space-y-2">
          {(otpStep === "idle" || otpStep === "sending") && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSendOtp}
              disabled={otpStep === "sending" || saveStatus === "loading"}
              aria-label="Odoslať overovací kód na telefón"
            >
              {otpStep === "sending" ? "Odosielam…" : "Odoslať overovací kód"}
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={otpStep === "verifying"}
                onClick={() => {
                  setOtpStep("idle");
                  setOtpCode("");
                  setOtpPhone(null);
                  setOtpError(null);
                }}
              >
                Zrušiť
              </Button>
            </div>
          )}
        </div>
      )}

      {otpError && (
        <p id="me-otp-error" className="text-destructive text-sm" role="alert">{otpError}</p>
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
            {phoneVerified
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
          disabled={saveStatus === "loading" || otpStep !== "idle"}
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
