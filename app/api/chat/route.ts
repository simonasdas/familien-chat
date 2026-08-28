import { currentUser } from "@/lib/auth";
import { addChatMessage, createPoll, getRecentChatMessages } from "@/lib/db";
import { getMessageBus } from "@/lib/bus";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ messages: getRecentChatMessages() });
}

export async function POST(request: Request) {
  const user = currentUser(request);
  if (!user) {
    return Response.json(
      { error: "Bitte registriere dich zuerst." },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const rawImageUrl =
    typeof body?.imageUrl === "string" ? body.imageUrl.trim() : "";
  const imageUrl =
    rawImageUrl.length > 0 && rawImageUrl.length <= 500 ? rawImageUrl : null;

  const rawAudioUrl =
    typeof body?.audioUrl === "string" ? body.audioUrl.trim() : "";
  const audioUrl =
    rawAudioUrl.length > 0 && rawAudioUrl.length <= 500 ? rawAudioUrl : null;

  const rawVideoUrl =
    typeof body?.videoUrl === "string" ? body.videoUrl.trim() : "";
  const videoUrl =
    rawVideoUrl.length > 0 && rawVideoUrl.length <= 500 ? rawVideoUrl : null;

  const announcement =
    body?.announcement && typeof body.announcement === "object"
      ? (body.announcement as Record<string, unknown>)
      : null;

  if (announcement) {
    const annTitle =
      typeof announcement.title === "string" ? announcement.title.trim() : "";
    const annDescription =
      typeof announcement.description === "string"
        ? announcement.description.trim()
        : "";
    const annImage =
      typeof announcement.imageUrl === "string"
        ? announcement.imageUrl.trim()
        : "";

    if (!annTitle) {
      return Response.json(
        { error: "Ankündigung braucht einen Titel." },
        { status: 400 }
      );
    }
    if (annTitle.length > 100 || annDescription.length > 1000) {
      return Response.json({ error: "Text ist zu lang." }, { status: 400 });
    }
    const annImageUrl =
      annImage.length > 0 && annImage.length <= 500 ? annImage : null;

    const message = addChatMessage(
      user.name,
      "",
      annImageUrl,
      null,
      null,
      null,
      annTitle,
      annDescription
    );

    const messages = getRecentChatMessages();
    getMessageBus().broadcast(messages);

    return Response.json({ message }, { status: 201 });
  }

  const pollPayload =
    body?.poll && typeof body.poll === "object"
      ? (body.poll as Record<string, unknown>)
      : null;

  if (pollPayload) {
    const question =
      typeof pollPayload.question === "string"
        ? pollPayload.question.trim()
        : "";
    const rawOpts = Array.isArray(pollPayload.options)
      ? (pollPayload.options as unknown[])
          .filter((o): o is string => typeof o === "string")
          .map((o) => o.trim())
          .filter(Boolean)
      : [];
    const options = Array.from(new Set(rawOpts)).slice(0, 12);
    if (!question) {
      return Response.json({ error: "Umfrage braucht eine Frage." }, { status: 400 });
    }
    if (options.length < 2) {
      return Response.json(
        { error: "Mindestens 2 Antwortmöglichkeiten." },
        { status: 400 }
      );
    }
    if (question.length > 200 || options.some((o) => o.length > 100)) {
      return Response.json(
        { error: "Umfrage zu lang." },
        { status: 400 }
      );
    }
    const anonymous = pollPayload.anonymous === true;
    const singleChoice = pollPayload.singleChoice !== false;

    const poll = createPoll(
      user.name,
      question,
      options,
      anonymous,
      singleChoice
    );
    const message = addChatMessage(user.name, question, null, null, null, poll.id);

    const messages = getRecentChatMessages();
    getMessageBus().broadcast(messages);

    return Response.json({ message }, { status: 201 });
  }

  if (!content && !imageUrl && !audioUrl && !videoUrl) {
    return Response.json(
      { error: "Nachricht, Foto, Video oder Sprachnachricht erforderlich." },
      { status: 400 }
    );
  }
  if (content.length > 1000) {
    return Response.json({ error: "Nachricht zu lang." }, { status: 400 });
  }

  const message = addChatMessage(user.name, content, imageUrl, audioUrl, videoUrl);

  const messages = getRecentChatMessages();
  getMessageBus().broadcast(messages);

  return Response.json({ message }, { status: 201 });
}
