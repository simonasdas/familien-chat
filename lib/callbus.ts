export interface CallEvent {
  from: string;
  to: string;
  type: string;
  payload?: unknown;
  ts: number;
}

export interface CallStream {
  name: string;
  send: (event: CallEvent) => void;
}

class CallBus {
  private streams: Set<CallStream> = new Set();

  register(stream: CallStream): () => void {
    this.streams.add(stream);
    return () => {
      this.streams.delete(stream);
    };
  }

  broadcast(event: CallEvent) {
    for (const stream of this.streams) {
      if (stream.name === event.from || stream.name === event.to) {
        try {
          stream.send(event);
        } catch {}
      }
    }
  }
}

const globalForCall = globalThis as unknown as { __callBus?: CallBus };

export function getCallBus(): CallBus {
  if (!globalForCall.__callBus) {
    globalForCall.__callBus = new CallBus();
  }
  return globalForCall.__callBus;
}
