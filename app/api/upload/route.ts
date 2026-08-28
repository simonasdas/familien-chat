import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "audio/webm": ".webm",
  "audio/webm;codecs=opus": ".webm",
  "audio/ogg": ".ogg",
  "audio/mpeg": ".mp3",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/wav": ".wav",
  "video/webm": ".webm",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/x-matroska": ".mkv",
};

const uploadsDir = path.join(process.cwd(), "data", "uploads");

export async function POST(request: Request) {
  const user = currentUser(request);
  if (!user) {
    return Response.json({ error: "Bitte registriere dich zuerst." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Upload fehlgeschlagen." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Keine Datei empfangen." }, { status: 400 });
  }
  const isAudio = file.type.startsWith("audio/");
  const isVideo = file.type.startsWith("video/");
  const sizeLimit = isVideo ? MAX_VIDEO_BYTES : isAudio ? MAX_AUDIO_BYTES : MAX_BYTES;
  if (file.size > sizeLimit) {
    return Response.json(
      { error: isVideo ? "Video ist zu groß (maximal 50 MB)." : isAudio ? "Sprachnachricht ist zu groß (maximal 15 MB)." : "Foto ist zu groß (maximal 5 MB)." },
      { status: 413 }
    );
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return Response.json(
      { error: isVideo ? "Dieses Videoformat wird nicht unterstützt." : isAudio ? "Dieses Audioformat wird nicht unterstützt." : "Nur JPG, PNG, WebP oder GIF erlaubt." },
      { status: 415 }
    );
  }

  if (!existsSync(uploadsDir)) await mkdir(uploadsDir, { recursive: true });
  const name = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, name), buffer);

  return Response.json({ url: `/api/uploads/${name}` }, { status: 201 });
}
