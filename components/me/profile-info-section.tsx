"use client";

import { useActionState } from "react";

import { updateProfileInfo } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FormState = { ok: true } | { ok: false; error: string } | null;

type ProfileInfoSectionProps = {
  initialDisplayName: string | null;
  initialBio: string | null;
};

export function ProfileInfoSection({
  initialDisplayName,
  initialBio,
}: ProfileInfoSectionProps) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    async (_prev, formData) => {
      return updateProfileInfo(
        String(formData.get("displayName") ?? ""),
        String(formData.get("bio") ?? "")
      );
    },
    null
  );

  return (
    <form action={formAction} className="space-y-3 rounded-lg border p-4">
      <div>
        <h2 className="text-sm font-semibold">Profil</h2>
        <p className="text-muted-foreground text-xs">
          Zobrazuje sa na tvojom verejnom profile.
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="profile-display-name" className="text-sm font-medium">
          Meno / prezývka
        </label>
        <Input
          id="profile-display-name"
          name="displayName"
          defaultValue={initialDisplayName ?? ""}
          placeholder="Napr. Jana Kvetinárka"
          maxLength={80}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="profile-bio" className="text-sm font-medium">
          Bio <span className="text-muted-foreground font-normal">(voliteľné)</span>
        </label>
        <textarea
          id="profile-bio"
          name="bio"
          defaultValue={initialBio ?? ""}
          placeholder="Pár slov o tebe…"
          rows={3}
          maxLength={500}
          className="border-input focus-visible:ring-ring w-full resize-y rounded-md border bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] md:text-sm"
        />
      </div>

      {state?.ok === false && (
        <p className="text-destructive text-sm">{state.error}</p>
      )}
      {state?.ok === true && (
        <p className="text-sm text-emerald-600">Profil bol uložený.</p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Ukladám…" : "Uložiť profil"}
      </Button>
    </form>
  );
}
