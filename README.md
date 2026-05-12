# QuizLive

A real-time multiplayer quiz game built with Next.js 14 and Pusher. No database, no login required.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Real-Time | Pusher Channels |
| Hosting | Vercel |

---

## Overview

QuizLive is a Kahoot-style quiz game where a host creates a room, builds a question set on the fly, and teams join from their own devices to compete in real time. Questions support three difficulty tiers with weighted scoring, a live countdown timer, and a full sound system with phase-specific music and answer stings. Everything runs through Pusher — no database or user accounts needed.

---

## Features

**Host Dashboard** — Create a room with a custom code, add multiple-choice questions with four choices each, set difficulty per question, configure the timer, and control the game phase from a single screen.

**Team Join Flow** — Players go to `/play`, enter the room code and a team name, and wait in a lobby until the host starts the game.

**Difficulty Tiers** — Three difficulty levels per question: Easy (1 point), Medium (2 points), and Hard (3 points), each with distinct color coding.

**Live Timer** — Countdown timer per question with increasing playback urgency as time runs low.

**Real-Time Sync** — All game state (questions, answers, scores, phase transitions) is broadcast to all connected clients via Pusher instantly.

**Answer Reveal** — After time is up, a drum roll plays, the correct answer is revealed, and teams see whether they got it right.

**Leaderboard** — Scores shown between rounds with round scores and cumulative totals.

**Winner Screen** — A dedicated winner and runner-up screen at game over, each with their own music.

**Sound System** — Phase-aware audio engine with preloaded sounds for countdown, reveal, correct/wrong stings, leaderboard, and winner screens.

---

## Getting Started

**Pusher Setup** — Sign up at [pusher.com](https://pusher.com), create a new app, enable Client Events under App Settings, and copy your credentials from App Keys.

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=ap1
PUSHER_APP_ID=your_app_id
PUSHER_SECRET=your_secret
```

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The `NEXT_PUBLIC_` variables are exposed to the browser. `PUSHER_APP_ID` and `PUSHER_SECRET` are server-side only.

---

## How to Play

**Host** — Go to `/host`, enter a room code, add questions, share the code with teams, then start the game. Advance through each phase: question, reveal, leaderboard, next question.

**Players** — Go to `/play` on their device, enter the room code and a team name, wait in the lobby, then answer each question before the timer runs out.

---

## Deployment

```bash
npm install -g vercel
vercel
```

Add the four environment variables under Project Settings in the Vercel dashboard before deploying.

---

## License

MIT