let _pusherClient: any = null;

export function getPusherClient() {
  if (typeof window === "undefined") return null;
  if (!_pusherClient) {
    const PusherClient = require("pusher-js");
    _pusherClient = new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER! }
    );
  }
  return _pusherClient;
}

export const pusherClient = {
  subscribe: (channel: string) => getPusherClient()?.subscribe(channel),
  unsubscribe: (channel: string) => getPusherClient()?.unsubscribe(channel),
};
