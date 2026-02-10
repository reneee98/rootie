"use client";

import { useState, useRef } from "react";
import { Camera, ImagePlus, X, ChevronUp, ChevronDown } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import type { StepProps, DraftPhoto } from "./wizard-shell";

type Props = StepProps & { userId: string };

export function StepPhotos({ draft, updateDraft, errors, userId }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError("");

    const supabase = createSupabaseBrowserClient();
    const newPhotos: DraftPhoto[] = [];

    for (const file of Array.from(files)) {
      if (draft.photos.length + newPhotos.length >= 10) {
        setUploadError("Maximum 10 fotiek.");
        break;
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error } = await supabase.storage
        .from("listing-photos")
        .upload(path, file, { contentType: file.type });

      if (error) {
        console.error("Upload error:", error);
        setUploadError("Nepodarilo sa nahrať fotku. Skúste to znova.");
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("listing-photos").getPublicUrl(path);

      newPhotos.push({ url: publicUrl, storagePath: path });
    }

    if (newPhotos.length > 0) {
      updateDraft({ photos: [...draft.photos, ...newPhotos] });
    }

    setUploading(false);

    /* Reset file inputs so re-selecting same file triggers change */
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const handleRemovePhoto = async (index: number) => {
    const photo = draft.photos[index];
    const supabase = createSupabaseBrowserClient();

    await supabase.storage
      .from("listing-photos")
      .remove([photo.storagePath]);

    const next = draft.photos.filter((_, i) => i !== index);
    updateDraft({ photos: next });
  };

  const handleMovePhoto = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= draft.photos.length) return;

    const next = [...draft.photos];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    updateDraft({ photos: next });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold mb-1">Fotky</h2>
        <p className="text-sm text-muted-foreground">
          Pridajte až 10 fotiek. Prvá bude hlavná.
        </p>
      </div>

      {/* Upload buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading || draft.photos.length >= 10}
          className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-muted p-6 hover:border-muted-foreground/30 disabled:opacity-50 transition-colors"
          aria-label="Odfotiť"
        >
          <Camera className="size-8 text-muted-foreground" />
          <span className="text-sm font-medium">Odfotiť</span>
        </button>

        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          disabled={uploading || draft.photos.length >= 10}
          className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-muted p-6 hover:border-muted-foreground/30 disabled:opacity-50 transition-colors"
          aria-label="Vybrať z galérie"
        >
          <ImagePlus className="size-8 text-muted-foreground" />
          <span className="text-sm font-medium">Galéria</span>
        </button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Uploading indicator */}
      {uploading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Nahrávam...
        </div>
      )}

      {/* Errors */}
      {(errors.photos || uploadError) && (
        <p className="text-sm text-destructive">
          {errors.photos || uploadError}
        </p>
      )}

      {/* Photo grid */}
      {draft.photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {draft.photos.map((photo, i) => (
            <div key={photo.storagePath} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                <img
                  src={photo.url}
                  alt={`Fotka ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* "Main" label on first photo */}
              {i === 0 && (
                <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] font-medium px-1.5 py-0.5 rounded">
                  Hlavná
                </span>
              )}

              {/* Delete button */}
              <button
                type="button"
                onClick={() => handleRemovePhoto(i)}
                className="absolute top-1 right-1 size-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                aria-label={`Odstrániť fotku ${i + 1}`}
              >
                <X className="size-3.5" />
              </button>

              {/* Reorder buttons */}
              <div className="absolute bottom-1 right-1 flex flex-col gap-0.5">
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => handleMovePhoto(i, "up")}
                    className="size-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    aria-label="Posunúť dopredu"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                )}
                {i < draft.photos.length - 1 && (
                  <button
                    type="button"
                    onClick={() => handleMovePhoto(i, "down")}
                    className="size-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    aria-label="Posunúť dozadu"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {draft.photos.length}/10 fotiek
      </p>
    </div>
  );
}
