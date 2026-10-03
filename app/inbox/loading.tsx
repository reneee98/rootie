export default function InboxLoading() {
  return (
    <div className="space-y-3 pb-24">
      <div className="space-y-2 px-1 pt-1">
        <div className="bg-muted h-8 w-28 animate-pulse rounded" />
        <div className="bg-muted h-4 w-52 animate-pulse rounded" />
      </div>
      <div className="bg-muted h-12 w-full animate-pulse rounded-[18px]" />
      <div className="bg-muted h-[46px] w-full animate-pulse rounded-[18px]" />
      <div className="rootie-surface flex flex-col divide-y divide-[#e9e2d1] overflow-hidden rounded-[18px]">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="px-3 py-3"
          >
            <div className="bg-muted h-14 w-full animate-pulse rounded-lg" />
          </div>
        ))}
      </div>
      <div className="text-center text-sm text-[#67635c]">
        Načítavam správy…
      </div>
    </div>
  );
}
