export default function InboxLoading() {
  return (
    <div className="space-y-4 pb-24">
      <div className="bg-muted h-8 w-32 animate-pulse rounded" />
      <div className="flex flex-col gap-2 py-8">
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
