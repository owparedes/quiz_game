import { NextRequest } from "next/server";
import Pusher from "pusher";
import {
  accept, cleanTeamName, createPlayerId, guard, isPlayerId, isRoomCode,
  playerToken, reject, verifyHost, verifyPlayer,
} from "@/lib/server";

export const dynamic = "force-dynamic";

const ANSWERS = ["A", "B", "C", "D"];
const MAX_SECONDS = 600;

let pusher: Pusher | null = null;

function client() {
  if (!pusher) {
    pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return pusher;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function seconds(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(MAX_SECONDS, Math.max(0, Math.round(value))) : 0;
}

type Outcome = { event: string; payload: Record<string, unknown>; reply?: Record<string, unknown> } | null;

function route(roomCode: string, event: unknown, data: Record<string, unknown>, token: unknown): Outcome {
  switch (event) {
    case "game:state":
      if (!verifyHost(roomCode, token)) return null;
      return { event, payload: data };

    case "game:timer":
      if (!verifyHost(roomCode, token) || typeof data.paused !== "boolean") return null;
      return { event, payload: { value: seconds(data.value), paused: data.paused } };

    case "game:join_rejected":
      if (!verifyHost(roomCode, token) || !isPlayerId(data.playerId)) return null;
      return { event, payload: { playerId: data.playerId } };

    case "player:join": {
      const teamName = cleanTeamName(data.teamName);
      if (!teamName) return null;
      const reuse = verifyPlayer(roomCode, teamName, data.playerId, data.token);
      const playerId = reuse ? (data.playerId as string) : createPlayerId();
      return {
        event,
        payload: { teamName, playerId },
        reply: { teamName, playerId, token: playerToken(roomCode, teamName, playerId) },
      };
    }

    case "player:answer": {
      const teamName = cleanTeamName(data.teamName);
      if (!teamName || !verifyPlayer(roomCode, teamName, data.playerId, data.token)) return null;
      if (typeof data.answer !== "string" || !ANSWERS.includes(data.answer)) return null;
      return { event, payload: { teamName, playerId: data.playerId, answer: data.answer, timeRemaining: seconds(data.timeRemaining) } };
    }

    case "player:request_state":
      return { event, payload: {} };

    default:
      return null;
  }
}

export async function POST(request: NextRequest) {
  const { body, error } = await guard(request, "pusher");
  if (error) return error;

  const { roomCode, event, data, token } = body;
  if (!isRoomCode(roomCode) || !isObject(data)) return reject(400, "Invalid request");

  const outcome = route(roomCode, event, data, token);
  if (!outcome) return reject(403, "Forbidden");

  try {
    await client().trigger(`quiz-${roomCode}`, outcome.event, outcome.payload);
  } catch {
    return reject(502, "Could not deliver message");
  }
  return accept(outcome.reply);
}
