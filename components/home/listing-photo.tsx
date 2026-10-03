"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";

export function ListingPhoto({ url, alt }: { url: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#f1ece1] text-xs text-[#67635c]">
        <ImageOff className="size-5" aria-hidden />
        Bez fotky
      </div>
    );
  }
  return (
    <Image fill src={url} alt={alt} className="object-cover" sizes="(max-width: 768px) 50vw, 182px"
      onLoad={(event) => {
        const image = event.currentTarget;
        if (image.naturalWidth <= 16 || image.naturalHeight <= 16) setFailed(true);
      }}
      onError={() => setFailed(true)}
    />
  );
}
