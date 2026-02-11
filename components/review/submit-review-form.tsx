"use client";

import { useActionState } from "react";
import Link from "next/link";

import { submitReview } from "@/lib/actions/reviews";
import { Button } from "@/components/ui/button";

type SubmitReviewFormProps = {
  sellerId: string;
  listingId: string;
  threadId: string;
};

type FormState = { ok: true } | { ok: false; error: string } | null;

export function SubmitReviewForm({
  sellerId,
  listingId,
  threadId,
}: SubmitReviewFormProps) {
  const [state, formAction] = useActionState<FormState, FormData>(
    async (_prev, formData) => {
      const rating = Number(formData.get("rating"));
      const body = (formData.get("body") as string)?.trim() || null;
      return submitReview(sellerId, listingId, threadId, rating, body);
    },
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="review-rating" className="mb-1 block text-sm font-medium">
          Hodnotenie (1–5)
        </label>
        <select
          id="review-rating"
          name="rating"
          required
          className="border-input bg-background focus-visible:ring-ring flex h-11 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
          aria-required
        >
          <option value="">Vyberte</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} {n === 5 ? "— výborné" : n === 1 ? "— slabé" : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="review-body" className="mb-1 block text-sm font-medium">
          Text recenzie (voliteľné)
        </label>
        <textarea
          id="review-body"
          name="body"
          rows={4}
          placeholder="Ako prebehla transakcia?"
          className="border-input bg-background focus-visible:ring-ring w-full resize-y rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
      </div>
      {state?.ok === false && (
        <p className="text-destructive text-sm">{state.error}</p>
      )}
      {state?.ok === true && (
        <p className="text-emerald-600 text-sm">
          Ďakujeme za hodnotenie.{" "}
          <Link href={`/profile/${sellerId}`} className="underline">
            Späť na profil
          </Link>
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={state?.ok === true}>
          Odoslať recenziu
        </Button>
        <Button asChild variant="outline" type="button">
          <Link href="/inbox">Zrušiť</Link>
        </Button>
      </div>
    </form>
  );
}
