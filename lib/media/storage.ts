import "server-only";
import crypto from "crypto";
import { prisma } from "../db";
import { createSupabaseAdmin } from "../supabase/admin";

/**
 * Media storage on Supabase Storage (bucket `public-media`, publicly readable).
 * Records a row in the Media table. Uploads use the service-role client, so
 * they are trusted server-side operations — callers of saveMedia/deleteMedia
 * are unchanged from the previous local-disk implementation.
 */

export const MEDIA_BUCKET = "public-media";
export const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export class MediaError extends Error {}

function sanitizeBase(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  return (
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "image"
  );
}

export async function saveMedia(file: File, folder = "general") {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new MediaError("Only JPG, PNG and WEBP images are allowed.");
  }
  if (file.size > MAX_BYTES) {
    throw new MediaError("Image is too large. Maximum size is 5 MB.");
  }

  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "general";
  const ext = EXT_BY_MIME[file.type];
  const key = `${safeFolder}/${sanitizeBase(file.name)}-${crypto.randomBytes(6).toString("hex")}.${ext}`;

  const bytes = Buffer.from(await file.arrayBuffer());
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(key, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new MediaError(`Upload failed: ${error.message}`);

  const { data: pub } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(key);

  return prisma.media.create({
    data: {
      filename: key,
      originalName: file.name.slice(0, 200),
      url: pub.publicUrl,
      mimeType: file.type,
      size: file.size,
      folder: safeFolder,
    },
  });
}

export async function deleteMedia(id: string) {
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return;
  const supabase = createSupabaseAdmin();
  // Remove from storage; ignore failures (row removal still proceeds).
  await supabase.storage.from(MEDIA_BUCKET).remove([media.filename]).catch(() => {});
  await prisma.media.delete({ where: { id } });
}

/** Where is this image URL referenced? Used by the media library. */
export async function findMediaUsage(url: string) {
  const [destHero, destGallery, pkgHero, pkgImages] = await Promise.all([
    prisma.destination.count({ where: { heroImage: url } }),
    prisma.destination.count({ where: { gallery: { contains: url } } }),
    prisma.tourPackage.count({ where: { heroImage: url } }),
    prisma.packageImage.count({ where: { url } }),
  ]);
  return {
    used: destHero + destGallery + pkgHero + pkgImages > 0,
    destinations: destHero + destGallery,
    packages: pkgHero + pkgImages,
  };
}
