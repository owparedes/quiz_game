let client: any = null;

function getClient() {
  if (typeof window === "undefined") return null;
  if (!client) {
    const Pusher = require("pusher-js");
    client = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER! });
  }
  return client;
}

export const pusher = {
  subscribe: (channel: string) => getClient()?.subscribe(channel),
  unsubscribe: (channel: string) => getClient()?.unsubscribe(channel),
};

export const roomChannel = (roomCode: string) => `quiz-${roomCode}`;

export async function broadcast(channel: string, event: string, data: unknown) {
  await fetch("/api/pusher", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel, event, data }),
  });
}
