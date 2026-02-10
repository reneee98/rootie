"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type Photo = { id: string; url: string; position: number };

type PhotoGalleryProps = {
  photos: Photo[];
  alt: string;
};

export function PhotoGallery({ photos, alt }: PhotoGalleryProps) {
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  if (photos.length === 0) {
    return (
      <div className="bg-muted flex aspect-[4/3] w-full items-center justify-center rounded-none">
        <span className="text-muted-foreground text-sm">Bez fotky</span>
      </div>
    );
  }

  const handlePrev = useCallback(() => {
    setCurrent((c) => (c > 0 ? c - 1 : photos.length - 1));
  }, [photos.length]);
  const handleNext = useCallback(() => {
    setCurrent((c) => (c < photos.length - 1 ? c + 1 : 0));
  }, [photos.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || photos.length <= 1) return;
    const width = el.clientWidth;
    el.scrollTo({ left: width * current, behavior: "smooth" });
  }, [current, photos.length]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || photos.length <= 1) return;
    const width = el.clientWidth;
    const index = Math.round(el.scrollLeft / width);
    setCurrent(Math.min(index, photos.length - 1));
  }, [photos.length]);

  return (
    <div className="relative">
      {/* Swipeable strip */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x mandatory" }}
        role="region"
        aria-label="Galéria fotiek"
      >
        {photos.map((p, i) => (
          <div
            key={p.id}
            className="bg-muted relative aspect-[4/3] w-full shrink-0 snap-start snap-always"
          >
            {!loaded[i] && (
              <div
                className="absolute inset-0 animate-pulse bg-muted"
                aria-hidden
              />
            )}
            <img
              src={p.url}
              alt={i === 0 ? alt : `${alt} — fotka ${i + 1}`}
              className={cn(
                "size-full object-cover transition-opacity duration-200",
                loaded[i] ? "opacity-100" : "opacity-0"
              )}
              loading={i === 0 ? "eager" : "lazy"}
              onLoad={() => setLoaded((prev) => ({ ...prev, [i]: true }))}
            />
          </div>
        ))}
      </div>

      {/* Nav arrows — 44px min tap target */}
      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute top-1/2 left-2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            aria-label="Predošlá fotka"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute top-1/2 right-2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            aria-label="Ďalšia fotka"
          >
            <ChevronRight className="size-5" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {photos.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setCurrent(i)}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full p-2"
              aria-label={`Fotka ${i + 1}`}
              aria-current={i === current ? "true" : undefined}
            >
              <span
                className={cn(
                  "block h-1.5 w-1.5 rounded-full transition-all",
                  i === current ? "bg-white scale-125" : "bg-white/50"
                )}
              />
            </button>
          ))}
        </div>
      )}

      {photos.length > 1 && (
        <span className="absolute top-3 right-3 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
          {current + 1}/{photos.length}
        </span>
      )}
    </div>
  );
}
