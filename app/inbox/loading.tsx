export default function InboxLoading() {
  return (
    <div className="rootie-page">
      <div className="rootie-page-header space-y-2">
        <div className="bg-muted h-5 w-24 animate-pulse rounded" />
        <div className="bg-muted h-8 w-40 animate-pulse rounded" />
      </div>
      <div className="rootie-surface flex flex-col gap-2 py-8 px-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-muted h-16 w-full animate-pulse rounded-lg"
          />
        ))}
      </div>
      <div className="text-muted-foreground text-center text-sm">
        Načítavam správu…
      </div>
    </div>
  );
}
