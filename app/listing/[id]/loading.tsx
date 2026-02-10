export default function ListingLoading() {
  return (
    <div className="space-y-4 pb-32">
      <div className="bg-muted aspect-[4/3] w-full animate-pulse rounded-lg" />
      <div className="space-y-2">
        <div className="bg-muted h-6 w-3/4 animate-pulse rounded" />
        <div className="bg-muted h-8 w-1/4 animate-pulse rounded" />
      </div>
      <div className="bg-muted h-24 w-full animate-pulse rounded-lg" />
      <div className="text-muted-foreground py-8 text-center text-sm">
        Načítavam inzerát…
      </div>
    </div>
  );
}
