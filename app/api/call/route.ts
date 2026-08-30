import { getCallBus } from "@/lib/callbus";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const me = currentUser(request);
  if (!me) {
    return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  let body: { to?: unknown; type?: unknown; payload?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  const type = typeof body.type === "string" ? body.type : "";
  if (!to || !type) {
    return Response.json({ error: "Fehlende Felder." }, { status: 400 });
  }

  getCallBus().broadcast({
    from: me.name,
    to,
    type,
    payload: body.payload ?? null,
    ts: Date.now(),
  });

  return Response.json({ ok: true });
}
