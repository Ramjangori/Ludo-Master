# 🎲 LUDO KING - REAL-TIME MULTIPLAYER WITH VOICE CHAT

A full-featured multiplayer **Ludo King** web application built with **Node.js, Express, Socket.io**, and **WebRTC Mesh Voice Chat** that allows players to talk with each other in real-time while rolling dice and competing on the royal board.

---

## 🌟 Key Features

### 🎙️ 1. Real-Time In-Game Voice Chat (WebRTC)
- **Peer-to-Peer Audio Mesh**: Ultra-low latency voice chat powered by WebRTC `RTCPeerConnection` and STUN servers.
- **Speaking Wave Indicator**: Animated green energy ripples around player avatars when someone is actively speaking (calculated using Web Audio API `AudioContext` and `AnalyserNode`).
- **Full Audio Controls**:
  - **Mute / Unmute**: Toggle your microphone instantly with visual status badges.
  - **Deafen Mode**: Mute incoming audio from all players when you need silence.
  - **Push-to-Talk (PTT)**: Toggle PTT mode and hold the **Spacebar** to talk.
  - **Individual Player Volume Control**: Click on any player's card to adjust their individual volume from 0% to 150%.
  - **Live Audio Level Meter**: Real-time visual feedback of microphone decibel levels in the top toolbar.

### 🎲 2. Authentic Ludo King Gameplay Mechanics
- **Full 15x15 Canvas Board**:
  - High-DPI canvas rendering sharp graphics across all screen resolutions.
  - 4 Royal Quadrants: **Red Empress, Green Knight, Yellow Monarch, Blue Baron**.
  - 8 Safe Squares (4 Starting Squares + 4 Star Squares ⭐) where tokens cannot be captured.
  - 4 Colored Home Straight Corridors leading to the central golden victory crown.
- **3D Animated Dice**:
  - Realistic 3D rotation, tumbling physics, and face reveal.
  - Sound effects for dice rattle, roll, and settle.
- **Classic Rules Enforced**:
  - Roll a **6** to unlock a pawn from the base yard.
  - Rolling a **6** grants an **Extra Bonus Roll**!
  - **Three Consecutive 6s Rule**: Rolling three 6s in a row forfeits the third roll and advances the turn.
  - **Capturing ("Cutting")**: Landing on an opponent's token in a non-safe square captures it, sends it back to their yard, and awards a **Bonus Roll**!
  - **Reaching Home**: Exact roll required to reach the center victory goal; reaching Home awards a **Bonus Roll**!
  - **Smart Token Stacking**: When multiple pawns land on the same square, they dynamically arrange in clean 2x2 or offset clusters so all tokens are visible and clickable.
  - **15-Second Turn Timer**: Visual countdown bar with automatic roll/move fallback.

### 🤖 3. Smart AI Bots (Solo & Fill Mode)
- **Quick Play Mode**: Jump into an instant 4-player match against intelligent AI bots in 1 click.
- **Fill with Bots**: In private multiplayer rooms, hosts can fill remaining empty slots with AI bots so you never have to wait for 4 human players to start.
- **Intelligent Heuristics**: Bots evaluate move priority (Capture > Reaching Home > Entering Home Corridor > Unlocking Yard > Safe Square > Escape Danger > Advance).

### 💬 4. In-Game Chat & Animated Reactions
- Floating animated emojis (😂, 🔥, 👑, 😱, 🎲, 👏, 💔, 🎯) that float across the board.
- Quick chat phrases ("Roll a 6 please!", "Good luck!", "Haha, nice move!", "Hurry up!").
- Real-time custom text chat with floating message bubbles.

### 🔊 5. Procedural Web Audio Engine
- 100% self-contained audio synthesis using the Web Audio API (zero missing audio files or network latency).
- Realistic wooden pawn hop steps, capture impact thud, safe star chimes, bonus fanfare, and victory celebration trumpets.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)

### 1. Installation
Navigate to the project folder:
```bash
cd "C:\Users\ramja\.gemini\antigravity\scratch\ludo-voice-game"
npm install
```

### 2. Start the Server
```bash
npm start
```
The server will start on port `3000`:
```
===============================================
🎲 LUDO VOICE KING Server running on port 3000
🌐 Local URL: http://localhost:3000
===============================================
```

### 3. Open in Browser
Open your browser and navigate to:
```
http://localhost:3000
```

To test multiplayer and voice chat on the same machine:
- Open two separate browser tabs or an Incognito window:
  1. In Tab 1: Click **"Create Private Room"**, copy the 6-character room code (or click "Copy Invite Link").
  2. In Tab 2: Click **"Join with Room Code"**, paste the room code, and click Join.
  3. Allow microphone permissions in both tabs to talk!

---

## 📁 Project Architecture

```
ludo-voice-game/
├── package.json               # Project manifest & npm scripts
├── server.js                  # Express + Socket.io + Ludo Game Engine + WebRTC Signaling
├── test/
│   ├── gameplay_test.js       # End-to-end integration test (Sockets, WebRTC, Turns)
│   └── rules_test.js          # Unit tests for Ludo capture, safe zones, and home rules
└── public/
    ├── index.html             # Royal Ludo UI, Lobby, Arena & Voice Toolbar
    ├── style.css              # Responsive luxury Ludo King styling & animations
    └── js/
        ├── sound.js           # Procedural Web Audio synthesizer (pawn steps, dice rattle, victory)
        ├── voice.js           # WebRTC mesh audio, volume analyser, speaking indicator
        ├── dice.js            # 3D interactive animated rolling dice
        ├── board.js           # High-DPI canvas board renderer & token animations
        └── game.js            # Main client controller & event coordinator
```

---

## 🧪 Running Tests

To run the automated rule validation and integration tests:
```bash
npm test
```

---

## 🎙️ Playing Across Devices on Local Wi-Fi / LAN
To play with friends or family on phones, laptops, and tablets on the same Wi-Fi:
1. Find your computer's local IP address (e.g. `192.168.1.15` in `ipconfig`).
2. Start the server (`npm start`).
3. Have your friends open `http://<your-ip>:3000` on their mobile or desktop browsers!
*(Note: Modern browsers allow `getUserMedia` microphone access on `localhost` or HTTPS. For LAN testing without HTTPS, desktop Chrome allows configuring `chrome://flags/#unsafely-treat-insecure-origin-as-secure`).*

---

## 🏆 License
MIT License. Created for high-performance multiplayer gaming with voice.
