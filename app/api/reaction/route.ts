import { currentUser } from "@/lib/auth";
import { getRecentChatMessages, toggleReaction } from "@/lib/db";
import { getMessageBus } from "@/lib/bus";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = currentUser(request);
  if (!user) {
    return Response.json({ error: "Bitte registriere dich zuerst." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  const messageId = Number(body?.messageId);
  const emoji = typeof body?.emoji === "string" ? body.emoji.trim() : "";
  if (!Number.isInteger(messageId) || !emoji || emoji.length > 8) {
    return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  try {
    const message = toggleReaction(messageId, user.name, emoji);
    const messages = getRecentChatMessages();
    getMessageBus().broadcast(messages);
    return Response.json({ message, messages }, { status: 200 });
  } catch {
    return Response.json({ error: "Fehler bei der Reaktion." }, { status: 400 });
  }
}
