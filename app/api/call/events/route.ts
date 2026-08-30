import { getCallBus, type CallEvent } from "@/lib/callbus";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const me = currentUser(request);
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const recv = (event: CallEvent) => {
        if (closed) return;
        try {
          const json = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${json}\n\n`));
        } catch {}
      };

      let unsubscribe: (() => void) | null = null;
      if (me) {
        unsubscribe = getCallBus().register({
          name: me.name,
          send: recv,
        });
      }

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
        unsubscribe?.();
        clearInterval(heartbeat);
        closed = true;
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
