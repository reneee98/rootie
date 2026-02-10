export default function WantedLoading() {
  return (
    <div className="space-y-4 pb-32">
      <div className="space-y-2">
        <div className="bg-muted h-6 w-1/3 animate-pulse rounded" />
        <div className="bg-muted h-7 w-2/3 animate-pulse rounded" />
      </div>
      <div className="bg-muted h-24 w-full animate-pulse rounded-lg" />
      <div className="text-muted-foreground py-8 text-center text-sm">
        Načítavam požiadavku…
      </div>
    </div>
  );
}
