import { NextRequest } from "next/server";
import { accept, createRoomCode, guard, hostToken } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { error } = await guard(request, "room", 20);
  if (error) return error;
  const roomCode = createRoomCode();
  return accept({ roomCode, hostToken: hostToken(roomCode) });
}
