import { currentUser } from "@/lib/auth";
import { getRecentChatMessages, voteOnPoll } from "@/lib/db";
import { getMessageBus } from "@/lib/bus";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = currentUser(request);
  if (!user) {
    return Response.json({ error: "Bitte registriere dich zuerst." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  const pollId = Number(body?.pollId);
  const optionId = Number(body?.optionId);
  if (!Number.isInteger(pollId) || !Number.isInteger(optionId)) {
    return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  try {
    const poll = voteOnPoll(pollId, optionId, user.name);
    const messages = getRecentChatMessages();
    getMessageBus().broadcast(messages);
    return Response.json({ poll, messages }, { status: 200 });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Fehler beim Abstimmen." },
      { status: 400 }
    );
  }
}
