"use client";

import { useActionState } from "react";

import { updateDefaultShippingAddress } from "@/lib/actions/profile";
import type { ProfileShippingAddress } from "@/lib/data/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FormState = { ok: true } | { ok: false; error: string } | null;

type DefaultShippingAddressSectionProps = {
  initialAddress: ProfileShippingAddress | null;
};

export function DefaultShippingAddressSection({
  initialAddress,
}: DefaultShippingAddressSectionProps) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    async (_prev, formData) => {
      return updateDefaultShippingAddress({
        name: String(formData.get("name") ?? ""),
        street: String(formData.get("street") ?? ""),
        city: String(formData.get("city") ?? ""),
        zip: String(formData.get("zip") ?? ""),
        country: String(formData.get("country") ?? ""),
        phone: String(formData.get("phone") ?? "") || null,
      });
    },
    null
  );

  return (
    <form action={formAction} className="space-y-3 rounded-lg border p-4">
      <div>
        <h2 className="text-sm font-semibold">Predvolená doručovacia adresa</h2>
        <p className="text-muted-foreground text-xs">
          Táto adresa sa len predvyplní v chate. Odošle sa až po potvrdení kupujúcim.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <label htmlFor="shipping-name" className="text-sm font-medium">
            Meno a priezvisko
          </label>
          <Input
            id="shipping-name"
            name="name"
            defaultValue={initialAddress?.name ?? ""}
            required
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label htmlFor="shipping-street" className="text-sm font-medium">
            Ulica a číslo
          </label>
          <Input
            id="shipping-street"
            name="street"
            defaultValue={initialAddress?.street ?? ""}
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="shipping-city" className="text-sm font-medium">
            Mesto
          </label>
          <Input
            id="shipping-city"
            name="city"
            defaultValue={initialAddress?.city ?? ""}
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="shipping-zip" className="text-sm font-medium">
            PSČ
          </label>
          <Input
            id="shipping-zip"
            name="zip"
            defaultValue={initialAddress?.zip ?? ""}
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="shipping-country" className="text-sm font-medium">
            Krajina
          </label>
          <Input
            id="shipping-country"
            name="country"
            defaultValue={initialAddress?.country ?? "Slovensko"}
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="shipping-phone" className="text-sm font-medium">
            Telefón (voliteľné)
          </label>
          <Input
            id="shipping-phone"
            name="phone"
            defaultValue={initialAddress?.phone ?? ""}
          />
        </div>
      </div>

      {state?.ok === false && (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok === true && (
        <p className="text-sm text-emerald-600">Adresa uložená.</p>
      )}

      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Ukladám…" : "Uložiť predvolenú adresu"}
      </Button>
    </form>
  );
}
