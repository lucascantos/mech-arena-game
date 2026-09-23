import Peer, { type DataConnection, type PeerOptions } from "peerjs";
import type { Link, Room } from "./link";

/** Prefix for PeerJS ids, so our short room codes don't collide with other apps on the public broker. */
const ID_PREFIX = "mecharena-";
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I
/** Give up joining after this long (ms). */
const JOIN_TIMEOUT = 15000;

/**
 * How browsers find a path to each other. STUN servers tell each browser its
 * public address (enough for most home networks); the TURN relay carries the
 * traffic when a router blocks direct connections.
 */
const PEER_OPTIONS: PeerOptions = {
  config: {
    iceServers: [
      { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun.cloudflare.com:3478"] },
      { urls: ["turn:eu-0.turn.peerjs.com:3478", "turn:us-0.turn.peerjs.com:3478"], username: "peerjs", credential: "peerjsp" },
    ],
  },
};

/** Why joining failed, for a clear message in the menu. */
export type JoinFailure = "no-room" | "network" | "timeout" | "broker";

function randomCode(): string {
  return Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
}

function wrap(conn: DataConnection, peer: Peer): Link {
  return {
    send: (m) => conn.open && conn.send(m),
    onMessage: (h) => conn.on("data", h),
    onClose: (h) => {
      conn.on("close", h);
      conn.on("error", h);
    },
    close: () => {
      conn.close();
      peer.destroy();
    },
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
    const peer = new Peer(ID_PREFIX + code, PEER_OPTIONS);
    const joinHandlers: ((link: Link) => void)[] = [];
    peer.on("open", () =>
      resolve({
        code,
        onJoin: (h) => joinHandlers.push(h),
        close: () => peer.destroy(),
      }),
    );
    peer.on("connection", (conn) =>
      conn.on("open", () => joinHandlers.forEach((h) => h({ ...wrap(conn, peer), close: () => conn.close() }))),
    );
    peer.on("error", (err) => reject(err));
  });
}

/** Joins the room with this code. Rejects with a JoinFailure if it can't connect. */
export function joinRoom(code: string): Promise<Link> {
  return new Promise((resolve, reject) => {
    const peer = new Peer(PEER_OPTIONS);
    let done = false;
    const fail = (why: JoinFailure) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      peer.destroy();
      reject(why);
    };
    const timer = setTimeout(() => fail("timeout"), JOIN_TIMEOUT);

    peer.on("error", (err) => fail(err.type === "peer-unavailable" ? "no-room" : err.type === "network" || err.type === "server-error" ? "broker" : "network"));
    peer.on("open", () => {
      const conn = peer.connect(ID_PREFIX + code.trim().toUpperCase(), { reliable: true });
      conn.on("open", () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(wrap(conn, peer));
      });
      conn.on("error", () => fail("network"));
      // The routers couldn't find a path between the two machines.
      conn.peerConnection?.addEventListener("iceconnectionstatechange", () => {
        if (conn.peerConnection.iceConnectionState === "failed") fail("network");
      });
    });
  });
}
