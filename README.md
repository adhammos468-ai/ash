# Vanish Party

An anonymous chat "room" that anyone can join just by typing the same word.
Everyone in a room gets a random anon name (no accounts, no login). Every
20 seconds, the whole chat for that room is wiped for everyone. If you close
the tab/app, you're simply gone from the room — nothing is saved anywhere.

This runs as a small Node.js server **on your own laptop**. It only works
while that process is running on that machine.

## 1. Install Node.js (one-time)

You need Node.js installed. Check with:

```
node -v
```

If that fails, install it from https://nodejs.org (LTS version).

## 2. Install dependencies (one-time)

Open a terminal in this folder and run:

```
npm install
```

## 3. Start the server

```
npm start
```

You'll see something like:

```
Vanish Party server running.
On this laptop:      http://localhost:3000
On your Wi-Fi network, others can join at:
  http://192.168.1.42:3000
```

- **You**, on the same laptop: open `http://localhost:3000` in a browser.
- **Other people on the same Wi-Fi/network**: they open the second URL
  (your laptop's local IP) in their browser. Any phone or laptop on the
  same network works, no app install needed.
- **People outside your network / over the internet**: your laptop isn't
  reachable from the internet by default. To allow that you'd need either:
  - port forwarding on your router for port 3000, or
  - a tunneling tool such as `ngrok` (`ngrok http 3000`), which gives you a
    temporary public URL that forwards to your laptop.
  Either way, the chat is still physically running on your laptop — if you
  close the terminal or your laptop sleeps, everyone gets disconnected.

## How it works

- Whoever types the same **word** on the join screen lands in the same room.
  The word itself is never stored — it's just used to group people together
  in memory while the server is running.
- Each person gets a random anonymous name like `SwiftFox482` for that
  session only.
- Every message is broadcast live to everyone in the room, then the whole
  room's chat is cleared automatically every 20 seconds (you'll see a
  countdown ring in the header).
- Nothing is ever written to disk — all messages live only in the server's
  memory for the seconds before they're cleared, and disappear completely
  if you stop the server.
- The **"Leave & watch something else"** button disconnects you and sends
  your browser to YouTube. Browsers don't allow a webpage to force-close a
  tab it didn't open itself, so this navigates you away instead — which has
  the same practical effect of leaving the site.

## 4. Put it online for free (works from anywhere, no laptop required)

[Render](https://render.com) currently gives every account a free "web
service" that supports WebSockets, needs no credit card, and gives you a
public `https://...onrender.com` URL anyone can open from anywhere. The
trade-off: a free service spins down after 15 minutes with no traffic, and
takes about a minute to wake back up on the next visit — fine for a chat
room with friends, not for something that needs to be instantly available
24/7. This project already includes a `render.yaml` so Render can set
everything up automatically.

Steps:

1. **Put this folder in a GitHub repo.** If you don't already have one:
   - Create a free account at https://github.com if needed.
   - Create a new repository, then upload this whole folder to it (drag
     and drop on the GitHub website works, or use `git push` if you're
     comfortable with git).
2. **Create a free Render account** at https://render.com (sign in with
   GitHub is easiest).
3. Click **New +** → **Blueprint**, then pick the GitHub repo you just made.
   Render will read `render.yaml` and configure the service automatically
   (Node app, free plan, `npm install` / `npm start`). Click **Apply**.
   - If you'd rather not use a Blueprint: **New +** → **Web Service** →
     pick the repo → Build Command `npm install` → Start Command
     `npm start` → Instance Type **Free** → Create Web Service.
4. Wait for the first deploy to finish (a couple of minutes). Render gives
   you a URL like `https://vanish-party.onrender.com` — that's the link
   you share with anyone, anywhere, to join.

Everything about the app (words as room codes, 20s auto-clear, anonymous
names, in-memory-only messages) works exactly the same once it's hosted
this way — it just no longer depends on your laptop being on.

## Files

- `server.js` — the Express + WebSocket server (rooms, timers, broadcasting)
- `public/index.html` — join screen + chat screen
- `public/style.css` — styling
- `public/client.js` — browser-side WebSocket logic, countdown ring, leave button
