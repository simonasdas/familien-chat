import { countUsers, deleteUserByName } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return Response.json({ error: "Kein Name angegeben." }, { status: 400 });
  }

  if (countUsers() <= 1) {
    return Response.json(
      { error: "Der letzte Benutzer kann nicht gelöscht werden." },
      { status: 400 }
    );
  }

  const deleted = deleteUserByName(name);
  if (!deleted) {
    return Response.json(
      { error: `Kein Benutzer mit dem Namen „${name}" gefunden.` },
      { status: 404 }
    );
  }

  return Response.json({ deleted: true, name });
}
