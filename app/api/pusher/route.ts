import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { channel, event, data } = await req.json();

  const Pusher = (await import("pusher")).default;
  const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    useTLS: true,
  });

  await pusher.trigger(channel, event, data);
  return NextResponse.json({ ok: true });
}