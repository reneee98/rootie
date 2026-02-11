export default function ChatThreadLoading() {
  return (
    <div className="flex h-dvh flex-col">
      <div className="border-b px-3 py-2">
        <div className="h-11 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="flex-1 space-y-3 px-3 py-4">
        <div className="ml-auto h-16 w-3/4 animate-pulse rounded-2xl bg-muted" />
        <div className="h-20 w-4/5 animate-pulse rounded-2xl bg-muted" />
        <div className="ml-auto h-14 w-2/3 animate-pulse rounded-2xl bg-muted" />
      </div>
      <div className="border-t px-3 py-3">
        <div className="h-11 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
