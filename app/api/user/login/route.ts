import { userCookieHeader } from "@/lib/auth";
import { getUserByName } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name || name.length > 80) {
    return Response.json(
      { error: "Bitte gib deinen Namen ein." },
      { status: 400 }
    );
  }

  const user = getUserByName(name);
  if (!user) {
    return Response.json(
      { error: `Kein Konto mit dem Namen „${name}" gefunden.` },
      { status: 404 }
    );
  }

  const res = Response.json({ user });
  res.headers.append("Set-Cookie", userCookieHeader(user.id));
  return res;
}
