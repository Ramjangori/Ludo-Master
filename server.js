const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));

// Colors in clockwise Ludo King order
const COLORS = ['red', 'green', 'yellow', 'blue'];
const COLOR_NAMES = {
  red: 'Red Empress',
  green: 'Green Knight',
  yellow: 'Yellow Monarch',
  blue: 'Blue Baron'
};

const START_INDEXES = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39
};

const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47];

// In-memory rooms
const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

class LudoGame {
  constructor(roomCode, maxPlayers = 4, withBots = false) {
    this.roomCode = roomCode;
    this.maxPlayers = maxPlayers;
    this.withBots = withBots;
    this.players = []; // Array of player objects
    this.status = 'lobby'; // 'lobby' | 'playing' | 'gameover'
    this.currentTurnIndex = 0;
    this.diceValue = null;
    this.canRoll = true;
    this.consecutiveSixes = 0;
    this.validMoves = [];
    this.turnTimer = null;
    this.turnTimeRemaining = 15;
    this.winners = []; // Array of finished player IDs
    this.history = [];
  }

  addPlayer(socketId, name, avatar, isBot = false) {
    if (this.players.length >= this.maxPlayers) return null;

    const availableColors = COLORS.filter(c => !this.players.some(p => p.color === c));
    const assignedColor = availableColors[0] || COLORS[this.players.length % 4];

    const player = {
      id: socketId,
      name: name || `Player ${this.players.length + 1}`,
      avatar: avatar || '👑',
      color: assignedColor,
      isBot: isBot,
      isReady: isBot ? true : false,
      isMuted: false,
      isDeafened: false,
      isSpeaking: false,
      tokens: [
        { id: 0, step: -1 }, // -1 = in yard, 0..50 = track, 51..55 = home straight, 56 = home
        { id: 1, step: -1 },
        { id: 2, step: -1 },
        { id: 3, step: -1 }
      ],
      rank: null
    };

    this.players.push(player);
    return player;
  }

  removePlayer(socketId) {
    const idx = this.players.findIndex(p => p.id === socketId);
    if (idx === -1) return null;

    const removed = this.players[idx];
    if (this.status === 'lobby') {
      this.players.splice(idx, 1);
    } else {
      // In active game, turn player into an intelligent Bot so other players can continue!
      removed.isBot = true;
      removed.name += ' (AI)';
      removed.id = `bot-${Date.now()}`;
      if (this.currentTurnIndex === idx && this.canRoll) {
        this.executeBotTurn();
      }
    }
    return removed;
  }

  fillWithBots() {
    while (this.players.length < this.maxPlayers) {
      const botNames = ['Cyber Knight', 'Grandmaster Bot', 'Pixel Sultan', 'Ludo Prince'];
      const botAvatars = ['🤖', '🧙‍♂️', '🦁', '🐉'];
      const botIndex = this.players.length;
      this.addPlayer(
        `bot-${Date.now()}-${botIndex}`,
        botNames[botIndex % botNames.length],
        botAvatars[botIndex % botAvatars.length],
        true
      );
    }
  }

  startGame() {
    if (this.players.length < 2) return false;
    this.status = 'playing';
    this.currentTurnIndex = 0;
    this.diceValue = null;
    this.canRoll = true;
    this.consecutiveSixes = 0;
    this.validMoves = [];
    this.winners = [];
    this.startTurn();
    return true;
  }

  getCurrentPlayer() {
    return this.players[this.currentTurnIndex];
  }

  startTurn() {
    clearInterval(this.turnTimer);
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer) return;

    // Check if current player has already finished
    if (currentPlayer.rank !== null) {
      this.advanceTurn();
      return;
    }

    this.diceValue = null;
    this.canRoll = true;
    this.validMoves = [];
    this.turnTimeRemaining = 15;

    this.broadcastState('turn-start', {
      currentPlayerId: currentPlayer.id,
      turnTimeRemaining: this.turnTimeRemaining
    });

    // Start turn countdown
    this.turnTimer = setInterval(() => {
      this.turnTimeRemaining--;
      if (this.turnTimeRemaining <= 0) {
        clearInterval(this.turnTimer);
        this.handleTurnTimeout();
      }
    }, 1000);

    // If bot, roll automatically after realistic delay
    if (currentPlayer.isBot) {
      setTimeout(() => {
        if (this.status === 'playing' && this.getCurrentPlayer()?.id === currentPlayer.id && this.canRoll) {
          this.rollDice(currentPlayer.id);
        }
      }, 900);
    }
  }

  handleTurnTimeout() {
    const player = this.getCurrentPlayer();
    if (!player) return;

    if (this.canRoll) {
      // Auto-roll
      const rollResult = this.rollDice(player.id);
      if (rollResult && rollResult.validMoves.length > 0) {
        // Auto-move first valid token
        setTimeout(() => {
          this.moveToken(player.id, rollResult.validMoves[0]);
        }, 600);
      }
    } else if (this.validMoves.length > 0) {
      // Already rolled, auto-pick first valid move
      this.moveToken(player.id, this.validMoves[0]);
    } else {
      this.advanceTurn();
    }
  }

  rollDice(playerId) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId || !this.canRoll || this.status !== 'playing') {
      return null;
    }

    // Friendly starting roll logic:
    // If all tokens are in base, ensure player gets a 6 quickly so game starts with action!
    const allTokensInYard = player.tokens.every(t => t.step === -1);
    let value;
    if (allTokensInYard) {
      player.rollsInYard = (player.rollsInYard || 0) + 1;
      // On 1st roll 40% chance of 6, on 2nd roll 60% chance, on 3rd roll guaranteed 6!
      if (player.rollsInYard >= 3 || Math.random() < 0.45) {
        value = 6;
        player.rollsInYard = 0;
      } else {
        value = Math.floor(Math.random() * 6) + 1;
      }
    } else {
      player.rollsInYard = 0;
      value = Math.floor(Math.random() * 6) + 1;
    }

    this.diceValue = value;
    this.canRoll = false;

    if (value === 6) {
      this.consecutiveSixes++;
    } else {
      this.consecutiveSixes = 0;
    }

    // Check 3 consecutive sixes rule
    if (this.consecutiveSixes === 3) {
      this.consecutiveSixes = 0;
      this.broadcastState('dice-rolled', {
        playerId: player.id,
        value: value,
        threeSixesPenalty: true
      });

      setTimeout(() => {
        this.advanceTurn();
      }, 1200);
      return { value, validMoves: [], threeSixesPenalty: true };
    }

    // Calculate valid moves
    this.validMoves = this.calculateValidMoves(player, value);

    this.broadcastState('dice-rolled', {
      playerId: player.id,
      value: value,
      validMoves: this.validMoves,
      consecutiveSixes: this.consecutiveSixes
    });

    if (this.validMoves.length === 0) {
      // No valid moves, pass turn after short pause
      setTimeout(() => {
        this.advanceTurn();
      }, 1100);
    } else if (player.isBot) {
      // Intelligent bot moves after realistic reaction time
      setTimeout(() => {
        this.executeBotMove(player, value, this.validMoves);
      }, 1000);
    }

    return { value, validMoves: this.validMoves };
  }

  calculateValidMoves(player, roll) {
    const valid = [];
    for (const token of player.tokens) {
      // If in yard (-1)
      if (token.step === -1) {
        if (roll === 6) {
          valid.push(token.id);
        }
      } else if (token.step >= 0 && token.step < 56) {
        // Can only move if not overshooting Home (step 56)
        if (token.step + roll <= 56) {
          valid.push(token.id);
        }
      }
    }
    return valid;
  }

  moveToken(playerId, tokenId) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId || !this.validMoves.includes(tokenId) || this.status !== 'playing') {
      return null;
    }

    clearInterval(this.turnTimer);
    const token = player.tokens.find(t => t.id === tokenId);
    if (!token) return null;

    let previousStep = token.step;
    let newStep;
    let capturedToken = null;
    let bonusRoll = false;

    if (token.step === -1) {
      // Bringing token out of yard onto starting square (step 0)
      newStep = 0;
      token.step = 0;
    } else {
      newStep = token.step + this.diceValue;
      token.step = newStep;
    }

    // Check for Home entry (step 56)
    const reachedHome = (newStep === 56);
    if (reachedHome) {
      bonusRoll = true;
      // Check if player has finished all 4 tokens!
      const allHome = player.tokens.every(t => t.step === 56);
      if (allHome && player.rank === null) {
        player.rank = this.winners.length + 1;
        this.winners.push(player.id);
      }
    }

    // Check for Capturing opponent token (only on common track step 0..50)
    if (newStep >= 0 && newStep <= 50) {
      const myTrackIndex = (START_INDEXES[player.color] + newStep) % 52;
      const isSafe = SAFE_SQUARES.includes(myTrackIndex);

      if (!isSafe) {
        for (const opp of this.players) {
          if (opp.id === player.id) continue;
          for (const oppToken of opp.tokens) {
            if (oppToken.step >= 0 && oppToken.step <= 50) {
              const oppTrackIndex = (START_INDEXES[opp.color] + oppToken.step) % 52;
              if (oppTrackIndex === myTrackIndex) {
                // Captured!
                oppToken.step = -1; // Send back to yard
                capturedToken = {
                  playerId: opp.id,
                  tokenId: oppToken.id,
                  color: opp.color
                };
                bonusRoll = true;
                break;
              }
            }
          }
          if (capturedToken) break;
        }
      }
    }

    // Check extra roll from rolling a 6
    if (this.diceValue === 6 && !reachedHome && !capturedToken) {
      bonusRoll = true;
    }

    // Check Game Over condition
    // Game is over when only 1 active player remains (or all humans finished)
    const activeRemaining = this.players.filter(p => p.rank === null);
    const isGameOver = activeRemaining.length <= 1 || (this.players.length === 2 && this.winners.length >= 1);

    if (isGameOver) {
      this.status = 'gameover';
      // Assign final rank to remaining player
      if (activeRemaining.length === 1 && activeRemaining[0].rank === null) {
        activeRemaining[0].rank = this.winners.length + 1;
        this.winners.push(activeRemaining[0].id);
      }
    }

    this.broadcastState('token-moved', {
      playerId: player.id,
      color: player.color,
      tokenId: tokenId,
      fromStep: previousStep,
      toStep: newStep,
      roll: this.diceValue,
      capturedToken: capturedToken,
      reachedHome: reachedHome,
      bonusRoll: bonusRoll,
      playerRank: player.rank,
      isGameOver: isGameOver,
      winners: this.players.filter(p => p.rank !== null).map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        rank: p.rank
      }))
    });

    if (isGameOver) {
      return;
    }

    // If bonus roll granted, player rolls again; otherwise advance turn!
    if (bonusRoll && player.rank === null) {
      setTimeout(() => {
        this.canRoll = true;
        this.validMoves = [];
        this.turnTimeRemaining = 15;
        this.broadcastState('bonus-turn', {
          currentPlayerId: player.id
        });
        this.startTurnCountdown();
        if (player.isBot) {
          setTimeout(() => this.rollDice(player.id), 900);
        }
      }, 1000);
    } else {
      setTimeout(() => {
        this.advanceTurn();
      }, 1100);
    }

    return { newStep, capturedToken, bonusRoll };
  }

  startTurnCountdown() {
    clearInterval(this.turnTimer);
    this.turnTimer = setInterval(() => {
      this.turnTimeRemaining--;
      if (this.turnTimeRemaining <= 0) {
        clearInterval(this.turnTimer);
        this.handleTurnTimeout();
      }
    }, 1000);
  }

  advanceTurn() {
    clearInterval(this.turnTimer);
    this.consecutiveSixes = 0;
    this.validMoves = [];

    // Find next player who hasn't finished yet
    let count = 0;
    do {
      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
      count++;
    } while (this.players[this.currentTurnIndex].rank !== null && count < this.players.length);

    if (count >= this.players.length) {
      this.status = 'gameover';
      this.broadcastState('game-over', { winners: this.winners });
      return;
    }

    this.startTurn();
  }

  executeBotTurn() {
    if (this.status !== 'playing') return;
    const player = this.getCurrentPlayer();
    if (!player || !player.isBot) return;

    if (this.canRoll) {
      this.rollDice(player.id);
    }
  }

  executeBotMove(player, roll, validMoves) {
    if (validMoves.length === 0) return;

    // AI heuristic scoring
    let bestTokenId = validMoves[0];
    let bestScore = -9999;

    for (const tokenId of validMoves) {
      const token = player.tokens.find(t => t.id === tokenId);
      let score = 0;

      if (token.step === -1) {
        // Bringing token out of yard
        score += 350;
      } else {
        const nextStep = token.step + roll;

        // Reaching home goal
        if (nextStep === 56) {
          score += 1000;
        } else if (nextStep >= 51) {
          // Inside home straight (completely safe!)
          score += 400 + (nextStep - 50) * 10;
        } else {
          const nextTrackIdx = (START_INDEXES[player.color] + nextStep) % 52;
          const isSafe = SAFE_SQUARES.includes(nextTrackIdx);

          if (isSafe) {
            score += 250;
          }

          // Check for captures
          let canCapture = false;
          for (const opp of this.players) {
            if (opp.id === player.id) continue;
            for (const oppToken of opp.tokens) {
              if (oppToken.step >= 0 && oppToken.step <= 50) {
                const oppTrack = (START_INDEXES[opp.color] + oppToken.step) % 52;
                if (oppTrack === nextTrackIdx && !isSafe) {
                  canCapture = true;
                  score += 850;
                  break;
                }
              }
            }
          }

          // Escape danger if token currently in danger
          const curTrackIdx = (START_INDEXES[player.color] + token.step) % 52;
          if (!SAFE_SQUARES.includes(curTrackIdx)) {
            for (const opp of this.players) {
              if (opp.id === player.id) continue;
              for (const oppToken of opp.tokens) {
                if (oppToken.step >= 0 && oppToken.step <= 50) {
                  const oppTrack = (START_INDEXES[opp.color] + oppToken.step) % 52;
                  const dist = (curTrackIdx - oppTrack + 52) % 52;
                  if (dist >= 1 && dist <= 6) {
                    score += 200; // Escaping!
                  }
                }
              }
            }
          }

          // Small progressive bonus for advancing forward
          score += token.step * 2;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestTokenId = tokenId;
      }
    }

    this.moveToken(player.id, bestTokenId);
  }

  broadcastState(event, data = {}) {
    io.to(this.roomCode).emit(event, {
      ...data,
      roomState: this.serialize()
    });
  }

  serialize() {
    return {
      roomCode: this.roomCode,
      status: this.status,
      maxPlayers: this.maxPlayers,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        color: p.color,
        isBot: p.isBot,
        isReady: p.isReady,
        isMuted: p.isMuted,
        isDeafened: p.isDeafened,
        isSpeaking: p.isSpeaking,
        tokens: p.tokens,
        rank: p.rank
      })),
      currentTurnIndex: this.currentTurnIndex,
      currentPlayerId: this.players[this.currentTurnIndex]?.id || null,
      diceValue: this.diceValue,
      canRoll: this.canRoll,
      validMoves: this.validMoves,
      turnTimeRemaining: this.turnTimeRemaining,
      winners: this.winners
    };
  }
}

// Socket.io Real-time Event Handlers
io.on('connection', (socket) => {
  let currentRoomCode = null;

  // 1. Create Room
  socket.on('create-room', ({ playerName, avatar, maxPlayers = 4, withBots = false }) => {
    let roomCode = generateRoomCode();
    while (rooms.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    const game = new LudoGame(roomCode, maxPlayers, withBots);
    const player = game.addPlayer(socket.id, playerName, avatar, false);

    if (withBots) {
      game.fillWithBots();
    }

    rooms.set(roomCode, game);
    currentRoomCode = roomCode;
    socket.join(roomCode);

    socket.emit('room-joined', {
      player,
      roomState: game.serialize()
    });
  });

  // 2. Join Room
  socket.on('join-room', ({ roomCode, playerName, avatar }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const game = rooms.get(code);

    if (!game) {
      socket.emit('error-message', { message: 'Room not found! Check the room code.' });
      return;
    }

    if (game.status !== 'lobby') {
      socket.emit('error-message', { message: 'Game has already started in this room!' });
      return;
    }

    if (game.players.length >= game.maxPlayers) {
      socket.emit('error-message', { message: 'Room is full!' });
      return;
    }

    const player = game.addPlayer(socket.id, playerName, avatar, false);
    currentRoomCode = code;
    socket.join(code);

    socket.emit('room-joined', {
      player,
      roomState: game.serialize()
    });

    // Notify room of updated state
    io.to(code).emit('room-updated', {
      roomState: game.serialize()
    });
  });

  // 3. Quick Play / Play with Bots (Instant solo or auto room)
  socket.on('quick-play-bots', ({ playerName, avatar, playerCount = 4 }) => {
    let roomCode = 'SOLO-' + generateRoomCode().substring(0, 4);
    const game = new LudoGame(roomCode, playerCount, true);
    const player = game.addPlayer(socket.id, playerName, avatar, false);
    game.fillWithBots();

    rooms.set(roomCode, game);
    currentRoomCode = roomCode;
    socket.join(roomCode);

    // Start game immediately so status is 'playing'
    game.startGame();

    socket.emit('room-joined', {
      player,
      roomState: game.serialize()
    });

    // Notify room that game has started so screen switches immediately to board
    io.to(roomCode).emit('game-started', {
      roomState: game.serialize()
    });
  });

  // 4. Fill Bots Button in Lobby
  socket.on('add-bots', () => {
    if (!currentRoomCode) return;
    const game = rooms.get(currentRoomCode);
    if (!game || game.status !== 'lobby') return;

    game.fillWithBots();
    io.to(currentRoomCode).emit('room-updated', {
      roomState: game.serialize()
    });
  });

  // 5. Start Game
  socket.on('start-game', () => {
    if (!currentRoomCode) return;
    const game = rooms.get(currentRoomCode);
    if (!game || game.status !== 'lobby') return;

    // Fill remaining spots with bots if less than max
    if (game.players.length < game.maxPlayers) {
      game.fillWithBots();
    }

    const started = game.startGame();
    if (started) {
      io.to(currentRoomCode).emit('game-started', {
        roomState: game.serialize()
      });
    }
  });

  // 6. Dice Roll
  socket.on('roll-dice', () => {
    if (!currentRoomCode) return;
    const game = rooms.get(currentRoomCode);
    if (!game) return;
    game.rollDice(socket.id);
  });

  // 7. Token Move
  socket.on('move-token', ({ tokenId }) => {
    if (!currentRoomCode) return;
    const game = rooms.get(currentRoomCode);
    if (!game) return;
    game.moveToken(socket.id, tokenId);
  });

  // 8. In-Game Chat / Phrases
  socket.on('send-chat', ({ message, phrase }) => {
    if (!currentRoomCode) return;
    const game = rooms.get(currentRoomCode);
    if (!game) return;
    const player = game.players.find(p => p.id === socket.id);
    if (!player) return;

    io.to(currentRoomCode).emit('chat-message', {
      playerId: socket.id,
      playerName: player.name,
      color: player.color,
      avatar: player.avatar,
      message: message || phrase,
      timestamp: Date.now()
    });
  });

  // 9. Animated Reactions / Floating Emojis
  socket.on('send-reaction', ({ emoji }) => {
    if (!currentRoomCode) return;
    const game = rooms.get(currentRoomCode);
    if (!game) return;
    const player = game.players.find(p => p.id === socket.id);
    if (!player) return;

    io.to(currentRoomCode).emit('reaction-sent', {
      playerId: socket.id,
      playerName: player.name,
      color: player.color,
      avatar: player.avatar,
      emoji: emoji
    });
  });

  // ==========================================
  // WebRTC Peer-to-Peer Voice Chat Signaling
  // ==========================================

  // Peer joined voice channel
  socket.on('voice-ready', () => {
    if (!currentRoomCode) return;
    const game = rooms.get(currentRoomCode);
    if (!game) return;
    const player = game.players.find(p => p.id === socket.id);

    // Notify all existing peers in this room that a new peer is ready
    socket.to(currentRoomCode).emit('voice-peer-joined', {
      peerId: socket.id,
      player: player
    });
  });

  // WebRTC Offer
  socket.on('voice-offer', ({ targetPeerId, offer }) => {
    io.to(targetPeerId).emit('voice-offer', {
      fromPeerId: socket.id,
      offer: offer
    });
  });

  // WebRTC Answer
  socket.on('voice-answer', ({ targetPeerId, answer }) => {
    io.to(targetPeerId).emit('voice-answer', {
      fromPeerId: socket.id,
      answer: answer
    });
  });

  // WebRTC ICE Candidate
  socket.on('voice-ice-candidate', ({ targetPeerId, candidate }) => {
    io.to(targetPeerId).emit('voice-ice-candidate', {
      fromPeerId: socket.id,
      candidate: candidate
    });
  });

  // Voice Speaking Status (Audio Activity Level)
  socket.on('voice-speaking', ({ isSpeaking, volume }) => {
    if (!currentRoomCode) return;
    const game = rooms.get(currentRoomCode);
    if (game) {
      const player = game.players.find(p => p.id === socket.id);
      if (player) {
        player.isSpeaking = isSpeaking;
      }
    }
    socket.to(currentRoomCode).emit('voice-speaking-status', {
      peerId: socket.id,
      isSpeaking: isSpeaking,
      volume: volume
    });
  });

  // Voice Mute Toggle
  socket.on('voice-mute-toggle', ({ isMuted }) => {
    if (!currentRoomCode) return;
    const game = rooms.get(currentRoomCode);
    if (game) {
      const player = game.players.find(p => p.id === socket.id);
      if (player) {
        player.isMuted = isMuted;
      }
    }
    io.to(currentRoomCode).emit('voice-mute-status', {
      peerId: socket.id,
      isMuted: isMuted
    });
  });

  // Voice Deafen Toggle
  socket.on('voice-deafen-toggle', ({ isDeafened }) => {
    if (!currentRoomCode) return;
    const game = rooms.get(currentRoomCode);
    if (game) {
      const player = game.players.find(p => p.id === socket.id);
      if (player) {
        player.isDeafened = isDeafened;
      }
    }
    io.to(currentRoomCode).emit('voice-deafen-status', {
      peerId: socket.id,
      isDeafened: isDeafened
    });
  });

  // Disconnection Handler
  socket.on('disconnect', () => {
    if (currentRoomCode) {
      // Notify voice peers
      socket.to(currentRoomCode).emit('voice-peer-left', {
        peerId: socket.id
      });

      const game = rooms.get(currentRoomCode);
      if (game) {
        game.removePlayer(socket.id);

        // If no human players left, delete room
        const hasHumans = game.players.some(p => !p.isBot);
        if (!hasHumans || game.players.length === 0) {
          clearInterval(game.turnTimer);
          rooms.delete(currentRoomCode);
        } else {
          io.to(currentRoomCode).emit('room-updated', {
            roomState: game.serialize()
          });
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🎲 LUDO VOICE KING Server running on port ${PORT}`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`===============================================`);
});
