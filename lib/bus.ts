import type { ChatMessage } from "@/lib/types";

type Listener = (messages: ChatMessage[]) => void;

class MessageBus {
  private listeners: Set<Listener> = new Set();
  private lastSnapshot = "";

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  broadcast(messages: ChatMessage[]) {
    const json = JSON.stringify(messages);
    if (json === this.lastSnapshot) return;
    this.lastSnapshot = json;
    for (const listener of this.listeners) {
      try {
        listener(messages);
      } catch {}
    }
  }

  get listenerCount(): number {
    return this.listeners.size;
  }
}

const globalForBus = globalThis as unknown as {
  __messageBus?: MessageBus;
};

export function getMessageBus(): MessageBus {
  if (!globalForBus.__messageBus) {
    globalForBus.__messageBus = new MessageBus();
  }
  return globalForBus.__messageBus;
}
