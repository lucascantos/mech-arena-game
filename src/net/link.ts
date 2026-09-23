/** A two-way message pipe between the host and one other player. */
export interface Link {
  send(message: unknown): void;
  onMessage(handler: (message: unknown) => void): void;
  onClose(handler: () => void): void;
  close(): void;
}

/** A hosted room: other players join it by its code. */
export interface Room {
  /** Short code other players type to join. */
  readonly code: string;
  onJoin(handler: (link: Link) => void): void;
  close(): void;
}

/**
 * One end of an in-memory link (no network), for tests. Sent messages queue
 * up on the other end until its `flush()` delivers them.
 */
export class MemoryLink implements Link {
  private readonly inbox: unknown[] = [];
  private other: MemoryLink | null = null;
  private messageHandler: (m: unknown) => void = () => {};
  private closeHandler: () => void = () => {};

  /** Two ends wired to each other. */
  static pair(): [MemoryLink, MemoryLink] {
    const a = new MemoryLink();
    const b = new MemoryLink();
    a.other = b;
    b.other = a;
    return [a, b];
  }

  send(message: unknown): void {
    this.other?.inbox.push(JSON.parse(JSON.stringify(message))); // like a real wire: plain data only
  }

  onMessage(handler: (message: unknown) => void): void {
    this.messageHandler = handler;
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }

  close(): void {
    this.closeHandler();
    this.other?.closeHandler();
  }

  flush(): void {
    while (this.inbox.length) this.messageHandler(this.inbox.shift());
  }
}
