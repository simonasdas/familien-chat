import {
  clearUserCookieHeader,
  currentUser,
  userCookieHeader,
} from "@/lib/auth";
import { createUser, updateUserProfile, getAllUsers } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = currentUser(request);
  if (!user) {
    return Response.json({ user: null, users: [] });
  }
  const users = getAllUsers();
  return Response.json({ user, users, memberCount: users.length });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const birthday = typeof body?.birthday === "string" ? body.birthday.trim() : "";
  const rawDevice =
    typeof body?.deviceId === "string" ? body.deviceId.trim() : "";
  const deviceId =
    rawDevice.length > 0 && rawDevice.length <= 64 ? rawDevice : null;

  if (!name || name.length > 80) {
    return Response.json(
      { error: "Bitte gib deinen Namen an." },
      { status: 400 }
    );
  }
  if (!birthday || !/^\d{2}\.\d{2}\.\d{4}$/.test(birthday)) {
    return Response.json(
      { error: "Bitte gib dein Geburtstag an (TT.MM.JJJJ)." },
      { status: 400 }
    );
  }

  const user = createUser(name, birthday, deviceId);
  const res = Response.json({ user });
  res.headers.append("Set-Cookie", userCookieHeader(user.id));
  return res;
}

export async function PUT(request: Request) {
  const user = currentUser(request);
  if (!user) {
    return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return Response.json({ error: "Ungültige Daten." }, { status: 400 });
  }

  const data: { name?: string; profileImage?: string | null; status?: string; vacation?: string; customStatus?: string } = {};

  if (typeof body.name === "string") {
    const trimmed = body.name.trim();
    if (!trimmed || trimmed.length > 80) {
      return Response.json({ error: "Name ungültig." }, { status: 400 });
    }
    data.name = trimmed;
  }

  if ("profileImage" in body) {
    if (body.profileImage === null || typeof body.profileImage === "string") {
      data.profileImage = body.profileImage as string | null;
    }
  }

  if (typeof body.status === "string") {
    data.status = body.status.trim();
  }

  if (typeof body.vacation === "string") {
    data.vacation = body.vacation.trim();
  }

  if (typeof body.customStatus === "string") {
    data.customStatus = body.customStatus.trim().slice(0, 120);
  }

  const updated = updateUserProfile(user.id, data);
  if (!updated) {
    return Response.json({ error: "Profil nicht gefunden." }, { status: 404 });
  }

  return Response.json({ user: updated });
}

export async function DELETE() {
  const res = Response.json({ loggedOut: true });
  res.headers.append("Set-Cookie", clearUserCookieHeader());
  return res;
}
