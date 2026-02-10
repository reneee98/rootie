"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Euro, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type OfferFormSubmitResult =
  | { ok: true; threadId: string }
  | { ok: false; error: string };

type OfferFormProps = {
  context: "wanted" | "listing";
  contextId: string;
  submitAction: (
    contextId: string,
    offerType: "price" | "swap",
    amount?: number,
    swapBody?: string
  ) => Promise<OfferFormSubmitResult>;
  backHref: string;
};

export function OfferForm({
  context,
  contextId,
  submitAction,
  backHref,
}: OfferFormProps) {
  const router = useRouter();
  const [offerType, setOfferType] = useState<"price" | "swap">("price");
  const [amount, setAmount] = useState("");
  const [swapBody, setSwapBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (offerType === "price") {
      const num = parseFloat(amount.replace(",", "."));
      if (isNaN(num) || num <= 0) {
        setError("Zadajte platnú sumu.");
        return;
      }
      setPending(true);
      const result = await submitAction(contextId, "price", num);
      setPending(false);
      if (result.ok) {
        router.push(`/chat/${result.threadId}`);
        return;
      }
      setError(result.error);
    } else {
      const text = swapBody.trim();
      if (!text) {
        setError("Popíšte, čo ponúkate na výmenu.");
        return;
      }
      setPending(true);
      const result = await submitAction(contextId, "swap", undefined, text);
      setPending(false);
      if (result.ok) {
        router.push(`/chat/${result.threadId}`);
        return;
      }
      setError(result.error);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        {context === "wanted"
          ? "Najprv pošlite ponuku (cenu alebo výmenu). Autor požiadavky ju uvidí a môže dohodu potvrdiť."
          : "Najprv pošlite ponuku (cenu alebo výmenu). Predajca ju uvidí a môže dohodu potvrdiť."}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Typ ponuky</legend>
          <div className="flex gap-3">
            <label className="border-input focus-within:ring-ring flex flex-1 cursor-pointer items-center gap-2 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input
                type="radio"
                name="offerType"
                value="price"
                checked={offerType === "price"}
                onChange={() => setOfferType("price")}
                className="size-4"
                aria-label="Ponuka ceny"
              />
              <Euro className="size-4 shrink-0" aria-hidden />
              <span className="text-sm font-medium">Ponuka ceny</span>
            </label>
            <label className="border-input focus-within:ring-ring flex flex-1 cursor-pointer items-center gap-2 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input
                type="radio"
                name="offerType"
                value="swap"
                checked={offerType === "swap"}
                onChange={() => setOfferType("swap")}
                className="size-4"
                aria-label="Ponuka výmeny"
              />
              <ArrowLeftRight className="size-4 shrink-0" aria-hidden />
              <span className="text-sm font-medium">Ponuka výmeny</span>
            </label>
          </div>
        </fieldset>

        {offerType === "price" && (
          <div className="space-y-2">
            <label htmlFor="offer-amount" className="text-sm font-medium">
              Suma (€)
            </label>
            <Input
              id="offer-amount"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={pending}
              aria-required
            />
          </div>
        )}

        {offerType === "swap" && (
          <div className="space-y-2">
            <label htmlFor="offer-swap" className="text-sm font-medium">
              Čo ponúkate na výmenu
            </label>
            <textarea
              id="offer-swap"
              className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[100px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Napríklad: Monstera deliciosa, odnož v 12 cm pot…"
              value={swapBody}
              onChange={(e) => setSwapBody(e.target.value)}
              rows={4}
              disabled={pending}
              aria-required
            />
          </div>
        )}

        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" asChild className="flex-1">
            <a href={backHref}>Späť</a>
          </Button>
          <Button type="submit" className="flex-1" disabled={pending}>
            {pending ? "Odosielam…" : "Odoslať ponuku"}
          </Button>
        </div>
      </form>
    </div>
  );
}
