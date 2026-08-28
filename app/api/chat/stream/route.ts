import { getRecentChatMessages } from "@/lib/db";
import { getMessageBus } from "@/lib/bus";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const bus = getMessageBus();

      const pushSnapshot = (messages: ReturnType<typeof getRecentChatMessages>) => {
        if (closed) return;
        try {
          const json = JSON.stringify({ messages });
          controller.enqueue(encoder.encode(`data: ${json}\n\n`));
        } catch {}
      };

      pushSnapshot(getRecentChatMessages());

      const unsubscribe = bus.subscribe((messages) => {
        pushSnapshot(messages);
      });

      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          closed = true;
          clearInterval(heartbeat);
        }
      }, 15000);

      request.signal.addEventListener("abort", () => {
        if (closed) return;
        closed = true;
        unsubscribe();
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
