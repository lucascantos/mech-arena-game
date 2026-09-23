import Peer, { type DataConnection } from "peerjs";
import type { Link, Room } from "./link";

/** Prefix for PeerJS ids, so our short room codes don't collide with other apps on the public broker. */
const ID_PREFIX = "mecharena-";
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I

function randomCode(): string {
  return Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
}

function wrap(conn: DataConnection): Link {
  return {
    send: (m) => conn.open && conn.send(m),
    onMessage: (h) => conn.on("data", h),
    onClose: (h) => {
      conn.on("close", h);
      conn.on("error", h);
    },
    close: () => conn.close(),
  };
}

/**
 * Hosts a room on this machine. PeerJS's public broker is only used to
 * introduce browsers to each other; game traffic then flows directly
 * (WebRTC data channels) between the host and each player.
 */
export function hostRoom(): Promise<Room> {
  return new Promise((resolve, reject) => {
    const code = randomCode();
    const peer = new Peer(ID_PREFIX + code);
    const joinHandlers: ((link: Link) => void)[] = [];
    peer.on("open", () =>
      resolve({
        code,
        onJoin: (h) => joinHandlers.push(h),
        close: () => peer.destroy(),
      }),
    );
    peer.on("connection", (conn) => conn.on("open", () => joinHandlers.forEach((h) => h(wrap(conn)))));
    peer.on("error", (err) => reject(err));
  });
}

/** Joins the room with this code. Rejects if the host can't be reached. */
export function joinRoom(code: string): Promise<Link> {
  return new Promise((resolve, reject) => {
    const peer = new Peer();
    peer.on("open", () => {
      const conn = peer.connect(ID_PREFIX + code.trim().toUpperCase(), { reliable: true });
      conn.on("open", () => resolve(wrap(conn)));
      conn.on("error", reject);
    });
    peer.on("error", (err) => reject(err));
  });
}
