import { createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
const PLAYER_ID_PATTERN = /^[a-f0-9]{32}$/;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const TEAM_NAME_MAX = 24;
const MAX_BODY_BYTES = 9000;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 600;
const MAX_TRACKED_CLIENTS = 10_000;

function secret() {
  const value = process.env.ROOM_SECRET || process.env.PUSHER_SECRET;
  if (!value || value.length < 16) throw new Error("Server secret is not configured");
  return value;
}

function sign(...parts: string[]) {
  return createHmac("sha256", secret()).update(parts.join("\u0000")).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createRoomCode() {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_ALPHABET[randomInt(ROOM_ALPHABET.length)];
  return code;
}

export function isRoomCode(value: unknown): value is string {
  return typeof value === "string" && ROOM_CODE_PATTERN.test(value);
}

export function hostToken(roomCode: string) {
  return sign("host", roomCode);
}

export function verifyHost(roomCode: string, token: unknown) {
  return typeof token === "string" && TOKEN_PATTERN.test(token) && safeEqual(token, hostToken(roomCode));
}

export function createPlayerId() {
  return randomBytes(16).toString("hex");
}

export function isPlayerId(value: unknown): value is string {
  return typeof value === "string" && PLAYER_ID_PATTERN.test(value);
}

export function playerToken(roomCode: string, teamName: string, playerId: string) {
  return sign("player", roomCode, teamName, playerId);
}

export function verifyPlayer(roomCode: string, teamName: string, playerId: unknown, token: unknown) {
  return isPlayerId(playerId)
    && typeof token === "string"
    && TOKEN_PATTERN.test(token)
    && safeEqual(token, playerToken(roomCode, teamName, playerId));
}

export function cleanTeamName(value: unknown) {
  if (typeof value !== "string") return null;
  const name = value.normalize("NFC").replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, "").replace(/\s+/g, " ").trim();
  if (!name || name.length > TEAM_NAME_MAX || name in Object.prototype) return null;
  return name;
}

const hits = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || request.ip || "unknown";
}

export function rateLimited(request: NextRequest, bucket: string, limit = RATE_LIMIT) {
  const now = Date.now();
  const key = `${bucket}:${clientKey(request)}`;
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    if (hits.size >= MAX_TRACKED_CLIENTS) {
      hits.forEach((value, name) => { if (value.resetAt <= now) hits.delete(name); });
      if (hits.size >= MAX_TRACKED_CLIENTS) hits.clear();
    }
    hits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > limit;
}

export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function readJson(request: NextRequest): Promise<Record<string, unknown> | null> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) return null;
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) return null;
  const text = await request.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) return null;
  try {
    const body = JSON.parse(text);
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

export function reject(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });
}

export function accept(data: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...data }, { headers: { "Cache-Control": "no-store" } });
}

export async function guard(request: NextRequest, bucket: string, limit?: number) {
  if (!sameOrigin(request)) return { error: reject(403, "Forbidden") };
  if (rateLimited(request, bucket, limit)) return { error: reject(429, "Too many requests") };
  const body = await readJson(request);
  if (!body) return { error: reject(400, "Invalid request") };
  return { body };
}
