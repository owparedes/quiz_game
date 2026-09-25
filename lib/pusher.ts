let client: any = null;

function getClient() {
  if (typeof window === "undefined") return null;
  if (!client) {
    const Pusher = require("pusher-js");
    client = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!, forceTLS: true });
  }
  return client;
}

export const pusher = {
  subscribe: (channel: string) => getClient()?.subscribe(channel),
  unsubscribe: (channel: string) => getClient()?.unsubscribe(channel),
};

export const roomChannel = (roomCode: string) => `quiz-${roomCode}`;

export const ROOM_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

async function post(url: string, body: unknown) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
    });
    const result = await response.json().catch(() => null);
    return response.ok && result?.ok ? result : null;
  } catch {
    return null;
  }
}

export function send(roomCode: string, event: string, data: Record<string, unknown>, token?: string) {
  return post("/api/pusher", { roomCode, event, data, token });
}

export async function createRoom(): Promise<{ roomCode: string; hostToken: string } | null> {
  const result = await post("/api/room", {});
  return result && typeof result.roomCode === "string" && typeof result.hostToken === "string" ? result : null;
}
