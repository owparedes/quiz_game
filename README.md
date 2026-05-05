# QuizLive

A real-time multiplayer quiz game built with Next.js 14 and Pusher. No database, no login required.

---

## Overview

QuizLive is a Kahoot-style quiz game where a host creates a room, builds a question set on the fly, and teams join from their own devices to compete in real time. Questions support three difficulty tiers with weighted scoring, a live countdown timer, and a full sound system with phase-specific music and answer stings. Everything runs through Pusher — no database or user accounts needed.

---

## Features

**Host Dashboard** — Create a room with a custom code, add multiple-choice questions (4 choices each), set difficulty per question, configure the timer, and control the game phase from a single screen.

**Team Join Flow** — Players go to `/play`, enter the room code and a team name, and wait in a lobby until the host starts the game.

**Difficulty Tiers** — Three difficulty levels per question: Easy (1 point), Medium (2 points), and Hard (3 points), each with distinct color coding.

**Live Timer** — Countdown timer per question with increasing playback urgency as time runs low.

**Real-Time Sync** — All game state (questions, answers, scores, phase transitions) is broadcast to all connected clients via Pusher channels instantly.

**Answer Reveal** — After time is up, a drum roll plays, the correct answer is revealed, and teams see whether they got it right.

**Leaderboard** — Scores are shown between rounds with round scores and cumulative totals.

**Winner Screen** — A dedicated winner and runner-up screen at game over, each with their own music.

**Sound System** — Phase-aware audio engine with preloaded sounds: countdown loop, drum roll reveal, correct/wrong stings, leaderboard music, and winner/runner-up tracks. Supports fade in/out and urgency-based playback rate changes.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Real-Time | Pusher (Channels) |
| Styling | Tailwind CSS |
| Deployment | Vercel |

---

## Project Structure

```
app/
├── host/page.tsx             Host dashboard — create room, manage game
├── play/page.tsx             Player join and answer screen
├── page.tsx                  Landing page
├── layout.tsx
└── api/
    └── pusher/route.ts       Pusher auth and event trigger endpoint

lib/
├── gameTypes.ts              Game state types, phases, difficulty config
├── pusher.ts                 Pusher client singleton
└── sounds.ts                 Audio engine — preloading, phases, fade logic

public/
└── sounds/
    ├── countdown.mp3         Loops during question phase
    ├── reveal.mp3            Drum roll during answer reveal
    ├── correct.mp3           Correct answer sting
    ├── wrong.mp3             Wrong answer sting
    ├── leaderboard.mp3       Loops on leaderboard screen
    ├── winner.mp3            Loops for the winning team
    └── runnerup.mp3          Loops for all other teams at game over
```

---

## Getting Started

### 1. Create a Pusher App

1. Sign up at [pusher.com](https://pusher.com) and create a new app.
2. Select the **ap1 (Asia Pacific)** cluster.
3. In **App Settings**, enable **Client Events** and save.
4. Go to **App Keys** and copy your `app_id`, `key`, `secret`, and `cluster`.

### 2. Set Up Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=ap1
PUSHER_APP_ID=your_app_id
PUSHER_SECRET=your_secret
```

### 3. Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_PUSHER_KEY` | Pusher app key (public) | Yes |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Pusher cluster (e.g. `ap1`) | Yes |
| `PUSHER_APP_ID` | Pusher app ID (server-side) | Yes |
| `PUSHER_SECRET` | Pusher secret key (server-side) | Yes |

The `NEXT_PUBLIC_` variables are exposed to the browser. The `PUSHER_APP_ID` and `PUSHER_SECRET` are server-side only.

---

## How to Play

**Host**

1. Go to `/host` and enter a room code (e.g. `PUSO2025`).
2. Add questions — each with 4 choices, a correct answer, a difficulty level, and a timer.
3. Share the room code with all teams.
4. Wait for teams to join, then click **Start Game**.
5. Advance through phases: question → reveal → leaderboard → next question.

**Players (each team)**

1. Go to `/play` on their device.
2. Enter the room code and a team name, then click **Join Game**.
3. Wait in the lobby for the host to start.
4. Answer each question before the timer runs out.

---

## Deploying to Vercel

```bash
npm install -g vercel
vercel
```

In the Vercel dashboard, add the same four environment variables under **Project Settings → Environment Variables** before deploying.

---

## License

MIT 