import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".webm": "video/webm",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  if (!/^[a-f0-9-]+\.(jpg|jpeg|png|webp|gif|webm|ogg|mp3|m4a|wav|mp4|mov|mkv)$/i.test(name)) {
    return new Response("Nicht gefunden.", { status: 404 });
  }

  const filePath = path.join(process.cwd(), "data", "uploads", name);
  if (!existsSync(filePath)) {
    return new Response("Nicht gefunden.", { status: 404 });
  }

  const ext = path.extname(name).toLowerCase();
  return new Response(new Uint8Array(readFileSync(filePath)), {
    headers: {
      "Content-Type": TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
