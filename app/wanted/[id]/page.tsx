import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftRight, Euro, MapPin, Calendar, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getWantedDetail } from "@/lib/data/wanted";
import { formatPrice, formatDateTime } from "@/lib/formatters";
import { getUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const INTENT_LABELS: Record<string, string> = {
  buy: "Kúpiť",
  swap: "Vymeniť",
  both: "Kúpiť aj vymeniť",
};

type WantedDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function WantedDetailPage({
  params,
}: WantedDetailPageProps) {
  const { id } = await params;
  const [wanted, currentUser] = await Promise.all([
    getWantedDetail(id),
    getUser(),
  ]);

  if (!wanted || wanted.status !== "active") {
    notFound();
  }

  const isOwnWanted = currentUser?.id === wanted.user_id;
  const isAuthenticated = !!currentUser;

  const budgetLabel =
    wanted.budget_min != null && wanted.budget_max != null
      ? `${formatPrice(wanted.budget_min)} – ${formatPrice(wanted.budget_max)} €`
      : wanted.budget_min != null
        ? `Od ${formatPrice(wanted.budget_min)} €`
        : wanted.budget_max != null
          ? `Do ${formatPrice(wanted.budget_max)} €`
          : "Dohodou";

  const displayName = wanted.user.display_name?.trim() || "Používateľ";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

  return (
    <div className="space-y-4 pb-32">
      <div className="space-y-2">
        <Badge variant="secondary" className="gap-0.5">
          <ArrowLeftRight className="size-3" aria-hidden />
          {INTENT_LABELS[wanted.intent] ?? wanted.intent}
        </Badge>
        <h1 className="text-xl font-bold leading-tight">
          {wanted.plant_name}
        </h1>
        <p className="text-muted-foreground text-sm flex items-center gap-1.5">
          <Euro className="size-4" aria-hidden />
          {budgetLabel}
        </p>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Detaily</h2>
        <dl className="grid gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span>
              {wanted.district ? `${wanted.district}, ` : ""}
              {wanted.region}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="size-3.5 shrink-0" aria-hidden />
            <span>Pridané {formatDateTime(wanted.created_at)}</span>
          </div>
        </dl>
      </div>

      {wanted.notes?.trim() && (
        <div className="space-y-2 rounded-lg border p-4">
          <h2 className="text-sm font-semibold">Poznámky</h2>
          <p className="text-muted-foreground whitespace-pre-wrap text-sm">
            {wanted.notes.trim()}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Používateľ</h2>
        <Link
          href={`/profile/${wanted.user.id}`}
          className="focus-visible:ring-ring flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent outline-none focus-visible:ring-2"
          aria-label={`Profil používateľa ${displayName}`}
        >
          <Avatar size="lg">
            {wanted.user.avatar_url ? (
              <AvatarImage src={wanted.user.avatar_url} alt={displayName} />
            ) : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium truncate">{displayName}</p>
            {wanted.user.region && (
              <p className="text-xs text-muted-foreground truncate">
                {wanted.user.region}
              </p>
            )}
          </div>
        </Link>
      </div>

      {/* Sticky CTA: above bottom nav (same as listing detail) */}
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/85 fixed right-0 left-0 z-40 border-t backdrop-blur py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bottom-[calc(3.5rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-md items-center gap-2 px-4">
          {isOwnWanted ? (
            <p className="text-muted-foreground flex-1 py-2 text-center text-sm">
              Toto je vaša požiadavka. Ponuky prídu do konverzácií.
            </p>
          ) : isAuthenticated ? (
            <Button asChild className="flex-1" size="lg">
              <Link href={`/wanted/${id}/offer`}>
                <MessageCircle className="size-4" aria-hidden />
                Poslať ponuku
              </Link>
            </Button>
          ) : (
            <Button asChild className="flex-1" size="lg">
              <Link
                href={`/login?next=${encodeURIComponent(`/wanted/${id}`)}`}
              >
                <MessageCircle className="size-4" aria-hidden />
                Poslať ponuku
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
