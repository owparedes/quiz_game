# 🎮 Quiz Game — Real-time Multiplayer

Kahoot-style quiz game built with Next.js + Pusher. No database, no login required.

## Setup

### 1. Create a Pusher Account
- Go to https://pusher.com and sign up for free
- Click "Create app"
- Name your app, select **ap1 (Asia Pacific)** cluster
- Choose React (frontend) and Node.js (backend)
- Click "Create app"

### 2. Enable Client Events
- In your Pusher dashboard, go to **App Settings**
- Toggle ON **"Enable client events"**
- Save changes

### 3. Get your API Keys
- Go to **App Keys** in the sidebar
- Copy: app_id, key, secret, cluster

### 4. Set Environment Variables

**Local development** — create `.env.local`:
```
NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=ap1
PUSHER_APP_ID=your_app_id
PUSHER_SECRET=your_secret
```

**Vercel** — go to Project Settings → Environment Variables and add the same 4 variables.

### 5. Install & Run
```bash
npm install
npm run dev
```

## How to Play

### Host
1. Go to `/host`
2. Type a room code (e.g. PUSO2025)
3. Add questions with 4 choices and mark the correct answer
4. Set timer duration
5. Share the room code with all teams
6. Wait for teams to join, then click **START GAME**

### Players (each team)
1. Go to `/play` on their device
2. Enter the room code and their team name
3. Click **JOIN GAME**
4. Wait for the host to start
5. Answer questions before the timer runs out!

## Deploy to Vercel
```bash
npm install -g vercel
vercel
```
