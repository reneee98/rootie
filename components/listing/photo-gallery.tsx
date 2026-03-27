"use client";

import Image from "next/image";
import { useState, useRef, useCallback, useEffect } from "react";
import { ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

type Photo = { id: string; url: string; position: number };

type PhotoGalleryProps = {
  photos: Photo[];
  alt: string;
  frameClassName?: string;
};

export function PhotoGallery({
  photos,
  alt,
  frameClassName,
}: PhotoGalleryProps) {
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const markLoaded = useCallback((index: number) => {
    setLoaded((prev) => {
      if (prev[index]) return prev;
      return { ...prev, [index]: true };
    });
  }, []);
  const markFailed = useCallback((index: number) => {
    setFailed((prev) => {
      if (prev[index]) return prev;
      return { ...prev, [index]: true };
    });
  }, []);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current != null) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || photos.length <= 1) return;
    if (scrollFrameRef.current != null) {
      cancelAnimationFrame(scrollFrameRef.current);
    }
    scrollFrameRef.current = requestAnimationFrame(() => {
      const width = Math.max(el.clientWidth, 1);
      const index = Math.round(el.scrollLeft / width);
      setCurrent(Math.min(Math.max(index, 0), photos.length - 1));
    });
  }, [photos.length]);

  const goToSlide = useCallback(
    (index: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const boundedIndex = Math.min(Math.max(index, 0), photos.length - 1);
      const width = Math.max(el.clientWidth, 1);
      el.scrollTo({ left: width * boundedIndex, behavior: "smooth" });
      setCurrent(boundedIndex);
    },
    [photos.length]
  );

  if (photos.length === 0) {
    return (
      <div
        className={cn(
          "bg-muted flex w-full items-center justify-center rounded-none",
          frameClassName ?? "aspect-[4/3]"
        )}
      >
        <span className="text-muted-foreground text-sm">Bez fotky</span>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden" style={{ touchAction: "pan-x" }}>
      {/* Swipeable strip */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory overscroll-contain overscroll-y-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-x",
        }}
        role="region"
        aria-label="Galéria fotiek"
      >
        {photos.map((p, i) => (
          <div
            key={p.id}
            className={cn(
              "bg-muted relative w-full shrink-0 snap-start snap-always",
              frameClassName ?? "aspect-[4/3]"
            )}
          >
            {!loaded[i] && !failed[i] && (
              <div
                className="absolute inset-0 animate-pulse bg-muted"
                aria-hidden
              />
            )}
            {failed[i] ? (
              <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-2 text-sm">
                <ImageOff className="size-5" aria-hidden />
                <span>Bez fotky</span>
              </div>
            ) : (
              <Image
                fill
                src={p.url}
                alt={i === 0 ? alt : `${alt} — fotka ${i + 1}`}
                draggable={false}
                className={cn(
                  "select-none object-cover transition-opacity duration-200",
                  loaded[i] ? "opacity-100" : "opacity-0"
                )}
                loading={i === 0 ? "eager" : "lazy"}
                onLoad={(event) => {
                  const image = event.currentTarget;
                  if (image.naturalWidth <= 16 || image.naturalHeight <= 16) {
                    markFailed(i);
                    markLoaded(i);
                    return;
                  }
                  markLoaded(i);
                }}
                onError={() => {
                  markFailed(i);
                  markLoaded(i);
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Dots indicator */}
      {photos.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/20 px-2 py-1 backdrop-blur-sm">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => goToSlide(i)}
              className="flex size-4 items-center justify-center rounded-full"
              aria-label={`Fotka ${i + 1}`}
              aria-current={i === current ? "true" : undefined}
            >
              <span
                className={cn(
                  "block rounded-full transition-all",
                  i === current ? "h-2 w-2 bg-white" : "h-1.5 w-1.5 bg-white/60"
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
