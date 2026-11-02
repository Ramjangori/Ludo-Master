// Main Game Controller for Ludo Voice King
// Coordinates Socket.io, WebRTC Voice, Board Canvas, 3D Dice, and Game UI.

document.addEventListener('DOMContentLoaded', () => {
  // Determine Server URL (supports Web, Android Native App & Custom Host)
  function getServerUrl() {
    const saved = localStorage.getItem('ludo_server_url');
    if (saved) return saved;
    // When running inside Android Native App or standalone, connect to live Render cloud server
    if (window.location.protocol === 'file:' || (window.location.hostname === 'localhost' && window.location.port === '') || (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform())) {
      return 'https://ludo-master-9vnk.onrender.com';
    }
    // If opened on localhost in browser, connect to local port
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return undefined; // uses current origin
    }
    return 'https://ludo-master-9vnk.onrender.com';
  }

  const serverUrl = getServerUrl();
  const socket = io(serverUrl);
  const sound = window.soundEngine;
  let voiceChat = null;
  let board = null;
  let dice = null;

  let localPlayer = null;
  let currentRoom = null;
  let selectedAvatar = '👑';

  // DOM Elements
  const screens = {
    home: document.getElementById('screen-home'),
    lobby: document.getElementById('screen-lobby'),
    game: document.getElementById('screen-game')
  };

  // Modals & Floating overlays
  const modalGameOver = document.getElementById('modal-gameover');
  const modalPlayerVolume = document.getElementById('modal-player-volume');
  const chatMessagesContainer = document.getElementById('chat-messages');

  // Top Voice Toolbar Elements
  const btnToggleMic = document.getElementById('btn-toggle-mic');
  const btnToggleDeafen = document.getElementById('btn-toggle-deafen');
  const btnVoicePtt = document.getElementById('btn-voice-ptt');
  const voiceLevelBar = document.getElementById('voice-level-bar');
  const voiceStatusText = document.getElementById('voice-status-text');
  const btnToggleSound = document.getElementById('btn-toggle-sound');

  // Initialize Voice Chat
  voiceChat = new VoiceChat(socket);

  // Hook voice callbacks
  voiceChat.onSpeakingChangeCallback = (peerId, isSpeaking, volume) => {
    updateAvatarSpeakingRing(peerId, isSpeaking);
  };

  voiceChat.onStatusChangeCallback = ({ active, error }) => {
    if (active) {
      voiceStatusText.textContent = 'Voice: Connected';
      voiceStatusText.classList.add('status-connected');
    } else if (error) {
      voiceStatusText.textContent = 'Mic off';
      voiceStatusText.classList.remove('status-connected');
    }
  };

  // Initialize Board
  board = new LudoBoard('board-canvas', (tokenId) => {
    // When local player clicks a valid token
    sound.playClick();
    socket.emit('move-token', { tokenId });
  });

  // Initialize 3D Dice Roller
  dice = new DiceRoller('dice-container', () => {
    // When local player clicks the dice to roll
    sound.playClick();
    socket.emit('roll-dice');
  });

  // ==========================================
  // Screen Switching
  // ==========================================
  function showScreen(screenName) {
    Object.keys(screens).forEach(key => {
      if (screens[key]) {
        const isTarget = (key === screenName);
        screens[key].classList.toggle('active', isTarget);
        screens[key].style.display = isTarget ? 'flex' : 'none';
      }
    });
    if (screenName === 'game' && board) {
      setTimeout(() => {
        board.resize();
        if (currentRoom) {
          board.updateState(currentRoom, localPlayer?.id);
        }
      }, 50);
    }
  }

  // ==========================================
  // Avatar Selection in Home Screen
  // ==========================================
  const avatarOptions = document.querySelectorAll('.avatar-option');
  avatarOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      avatarOptions.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedAvatar = opt.getAttribute('data-avatar') || '👑';
      sound.playClick();
    });
  });

  function getPlayerName() {
    const input = document.getElementById('player-name-input');
    const val = input ? input.value.trim() : '';
    return val || `Player_${Math.floor(Math.random() * 900 + 100)}`;
  }

  // Check URL parameters for direct room join (e.g. ?room=XYZ123)
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam) {
    const roomInput = document.getElementById('join-code-input');
    if (roomInput) roomInput.value = roomParam.toUpperCase();
  }

  // ==========================================
  // Home Screen Actions
  // ==========================================
  document.getElementById('btn-quick-play').addEventListener('click', () => {
    sound.init();
    sound.playClick();
    const name = getPlayerName();
    socket.emit('quick-play-bots', {
      playerName: name,
      avatar: selectedAvatar,
      playerCount: 4
    });
  });

  document.getElementById('btn-create-room').addEventListener('click', () => {
    sound.init();
    sound.playClick();
    const name = getPlayerName();
    const countSelect = document.getElementById('create-players-count');
    const maxPlayers = countSelect ? parseInt(countSelect.value, 10) : 4;

    socket.emit('create-room', {
      playerName: name,
      avatar: selectedAvatar,
      maxPlayers: maxPlayers,
      withBots: false
    });
  });

  document.getElementById('btn-join-room').addEventListener('click', () => {
    sound.init();
    sound.playClick();
    const name = getPlayerName();
    const codeInput = document.getElementById('join-code-input');
    const code = codeInput ? codeInput.value.trim().toUpperCase() : '';

    if (!code) {
      showToast('Please enter a 6-character room code!');
      return;
    }

    socket.emit('join-room', {
      roomCode: code,
      playerName: name,
      avatar: selectedAvatar
    });
  });

  // Server Settings Modal Handlers
  const btnOpenServer = document.getElementById('btn-open-server-settings');
  const modalServer = document.getElementById('modal-server-settings');
  const inputServer = document.getElementById('input-server-url');
  const serverLabel = document.getElementById('server-status-label');

  if (serverLabel) {
    const saved = localStorage.getItem('ludo_server_url');
    if (saved) {
      serverLabel.textContent = 'Custom';
    } else {
      serverLabel.textContent = window.location.hostname === 'localhost' ? 'Local' : 'Online';
    }
  }

  btnOpenServer?.addEventListener('click', () => {
    sound.playClick();
    if (inputServer) {
      inputServer.value = localStorage.getItem('ludo_server_url') || (window.location.protocol.startsWith('http') ? window.location.origin : '');
    }
    modalServer?.classList.add('active');
  });

  document.getElementById('btn-close-server-settings')?.addEventListener('click', () => {
    sound.playClick();
    modalServer?.classList.remove('active');
  });

  document.getElementById('btn-save-server-url')?.addEventListener('click', () => {
    sound.playClick();
    const url = inputServer?.value.trim();
    if (url) {
      localStorage.setItem('ludo_server_url', url);
    } else {
      localStorage.removeItem('ludo_server_url');
    }
    modalServer?.classList.remove('active');
    location.reload();
  });

  // ==========================================
  // Lobby Actions
  // ==========================================
  document.getElementById('btn-add-bots')?.addEventListener('click', () => {
    sound.playClick();
    socket.emit('add-bots');
  });

  document.getElementById('btn-start-game')?.addEventListener('click', () => {
    sound.playClick();
    socket.emit('start-game');
  });

  document.getElementById('btn-copy-code')?.addEventListener('click', () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.roomCode);
    showToast(`Room code ${currentRoom.roomCode} copied to clipboard!`);
    sound.playClick();
  });

  document.getElementById('btn-copy-link')?.addEventListener('click', () => {
    if (!currentRoom) return;
    const inviteUrl = `${window.location.origin}?room=${currentRoom.roomCode}`;
    navigator.clipboard.writeText(inviteUrl);
    showToast('Invite link copied! Send it to your friends.');
    sound.playClick();
  });

  // ==========================================
  // In-Game Voice & Audio Controls
  // ==========================================
  btnToggleMic.addEventListener('click', () => {
    sound.playClick();
    const isActive = voiceChat.toggleMic();
    updateMicButtonUI(isActive);
  });

  btnToggleDeafen.addEventListener('click', () => {
    sound.playClick();
    const isDeafened = voiceChat.toggleDeafen();
    btnToggleDeafen.classList.toggle('active-deafen', isDeafened);
    btnToggleDeafen.querySelector('.btn-label').textContent = isDeafened ? 'Undeafen' : 'Deafen';
    btnToggleDeafen.querySelector('.btn-icon').textContent = isDeafened ? '🚫' : '🎧';
  });

  btnVoicePtt.addEventListener('click', () => {
    sound.playClick();
    const isPtt = voiceChat.togglePushToTalk(!voiceChat.isPushToTalk);
    btnVoicePtt.classList.toggle('active', isPtt);
    btnVoicePtt.title = isPtt ? 'Push to Talk: Hold Spacebar to speak' : 'Open Mic mode';
    showToast(isPtt ? 'Push to Talk active! Hold Spacebar to speak.' : 'Open Mic active!');
  });

  btnToggleSound.addEventListener('click', () => {
    const isMuted = sound.toggleMute();
    btnToggleSound.querySelector('.btn-icon').textContent = isMuted ? '🔇' : '🔊';
    btnToggleSound.classList.toggle('muted', isMuted);
    showToast(isMuted ? 'Game Sound Muted' : 'Game Sound Unmuted');
  });

  function updateMicButtonUI(isActive) {
    btnToggleMic.classList.toggle('muted', !isActive);
    btnToggleMic.querySelector('.btn-icon').textContent = isActive ? '🎙️' : '🔇';
    btnToggleMic.querySelector('.btn-label').textContent = isActive ? 'Mute' : 'Unmute';
  }

  // ==========================================
  // Quick Chat & Reactions
  // ==========================================
  const quickReactions = document.querySelectorAll('.reaction-btn');
  quickReactions.forEach(btn => {
    btn.addEventListener('click', () => {
      const emoji = btn.getAttribute('data-emoji');
      if (emoji) {
        sound.playClick();
        socket.emit('send-reaction', { emoji });
      }
    });
  });

  const quickPhrases = document.querySelectorAll('.phrase-btn');
  quickPhrases.forEach(btn => {
    btn.addEventListener('click', () => {
      const phrase = btn.textContent.trim();
      if (phrase) {
        sound.playClick();
        socket.emit('send-chat', { phrase });
      }
    });
  });

  const chatInput = document.getElementById('chat-input-text');
  const btnSendChat = document.getElementById('btn-send-chat');

  function sendChatMessage() {
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text) return;
    socket.emit('send-chat', { message: text });
    chatInput.value = '';
    sound.playClick();
  }

  if (btnSendChat) btnSendChat.addEventListener('click', sendChatMessage);
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        sendChatMessage();
      }
    });
  }

  // ==========================================
  // Socket.io Game Events
  // ==========================================
  socket.on('room-joined', ({ player, roomState }) => {
    localPlayer = player;
    currentRoom = roomState;

    // Start WebRTC microphone
    voiceChat.startVoice();

    if (roomState.status === 'playing') {
      showScreen('game');
      board.updateState(roomState, localPlayer.id);
      updateGameUI(roomState);
    } else {
      showScreen('lobby');
      updateLobbyUI(roomState);
    }
  });

  socket.on('room-updated', ({ roomState }) => {
    currentRoom = roomState;
    if (roomState.status === 'lobby') {
      updateLobbyUI(roomState);
    } else {
      board.updateState(roomState, localPlayer?.id);
      updateGameUI(roomState);
    }
  });

  socket.on('game-started', ({ roomState }) => {
    currentRoom = roomState;
    showScreen('game');
    board.updateState(roomState, localPlayer?.id);
    updateGameUI(roomState);
    sound.playTurnAlert();
    showToast('Game has started! May the luck of the dice be with you.');
  });

  socket.on('turn-start', ({ currentPlayerId, turnTimeRemaining, roomState }) => {
    currentRoom = roomState;
    if (roomState.status === 'playing') {
      showScreen('game');
    }
    board.updateState(roomState, localPlayer?.id);
    updateGameUI(roomState);

    const isMyTurn = (currentPlayerId === localPlayer?.id);
    if (isMyTurn) {
      sound.playTurnAlert();
      dice.setCanRoll(true, localPlayer.color);
      showTurnBanner('👉 YOUR TURN! TAP THE DICE TO ROLL');
    } else {
      dice.setCanRoll(false);
      const curPlayer = roomState.players.find(p => p.id === currentPlayerId);
      showTurnBanner(`⏳ ${curPlayer?.name || 'Player'}'s turn...`);
    }
  });

  socket.on('dice-rolled', ({ playerId, value, validMoves, threeSixesPenalty, roomState }) => {
    currentRoom = roomState;
    if (roomState.status === 'playing') {
      showScreen('game');
    }
    board.updateState(roomState, localPlayer?.id);

    const isLocal = (playerId === localPlayer?.id);
    const rollingPlayer = roomState.players.find(p => p.id === playerId);

    // Animate 3D dice
    dice.animateRoll(value, () => {
      if (threeSixesPenalty) {
        showToast('Three 6s in a row! Turn forfeited.', true);
        return;
      }

      if (isLocal) {
        if (value === 6) {
          showToast('🎉 YOU ROLLED 6! ✨ EXTRA ROLL!');
        }
        if (validMoves && validMoves.length > 0) {
          showTurnBanner(`🎲 ROLLED ${value}! 👉 TAP YOUR BOUNCING PAWN TO MOVE`);
        } else {
          showTurnBanner(`🎲 Rolled ${value} — No valid moves for pawns.`);
        }
      } else {
        showTurnBanner(`🎲 ${rollingPlayer?.name || 'Player'} rolled ${value}`);
      }
    });
  });

  socket.on('token-moved', ({ playerId, color, tokenId, fromStep, toStep, roll, capturedToken, reachedHome, bonusRoll, playerRank, isGameOver, winners, roomState }) => {
    currentRoom = roomState;

    board.animateTokenMove(color, tokenId, fromStep, toStep, () => {
      board.updateState(roomState, localPlayer?.id);
      updateGameUI(roomState);

      if (capturedToken) {
        sound.playCapture();
        const victim = roomState.players.find(p => p.id === capturedToken.playerId);
        showToast(`💥 ${victim?.name || 'Opponent'}'s token was captured! Bonus roll awarded!`);
      }

      if (reachedHome) {
        sound.playVictory();
        showToast(`🎉 Token reached Home! Bonus roll awarded!`);
      }

      if (playerRank) {
        sound.playVictory();
        const winner = roomState.players.find(p => p.id === playerId);
        showToast(`🏆 ${winner?.name} has finished Rank #${playerRank}!`);
      }

      if (isGameOver) {
        handleGameOver(winners, roomState);
      }
    });
  });

  socket.on('bonus-turn', ({ currentPlayerId, roomState }) => {
    currentRoom = roomState;
    board.updateState(roomState, localPlayer?.id);
    updateGameUI(roomState);

    const isMyTurn = (currentPlayerId === localPlayer?.id);
    if (isMyTurn) {
      sound.playBonusSix();
      dice.setCanRoll(true, localPlayer.color);
      showTurnBanner('✨ BONUS ROLL! Roll again!');
    }
  });

  socket.on('game-over', ({ winners, roomState }) => {
    handleGameOver(winners, roomState);
  });

  socket.on('chat-message', ({ playerName, color, avatar, message }) => {
    sound.playChatPop();
    appendChatMessage(playerName, color, avatar, message);
  });

  socket.on('reaction-sent', ({ playerId, playerName, emoji }) => {
    sound.playChatPop();
    spawnFloatingEmoji(playerId, emoji);
  });

  socket.on('error-message', ({ message }) => {
    showToast(message, true);
  });

  // ==========================================
  // UI Helpers & Renderers
  // ==========================================
  function updateLobbyUI(roomState) {
    const codeEl = document.getElementById('lobby-room-code');
    if (codeEl) codeEl.textContent = roomState.roomCode;

    const listEl = document.getElementById('lobby-players-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    for (let i = 0; i < roomState.maxPlayers; i++) {
      const p = roomState.players[i];
      const slot = document.createElement('div');
      slot.className = 'lobby-player-card';

      if (p) {
        slot.classList.add(`color-${p.color}`);
        slot.innerHTML = `
          <div class="lobby-avatar">${p.avatar}</div>
          <div class="lobby-info">
            <span class="lobby-name">${escapeHtml(p.name)} ${p.id === localPlayer?.id ? '(You)' : ''}</span>
            <span class="lobby-badge ${p.isBot ? 'badge-bot' : 'badge-player'}">${p.isBot ? '🤖 AI Bot' : '👤 Human'}</span>
          </div>
          <div class="lobby-color-indicator ${p.color}"></div>
        `;
      } else {
        slot.classList.add('empty-slot');
        slot.innerHTML = `
          <div class="lobby-avatar">⏳</div>
          <div class="lobby-info">
            <span class="lobby-name">Waiting for player...</span>
            <span class="lobby-badge">Slot ${i + 1}</span>
          </div>
        `;
      }
      listEl.appendChild(slot);
    }

    const btnStart = document.getElementById('btn-start-game');
    if (btnStart) {
      const isHost = roomState.players[0]?.id === localPlayer?.id;
      btnStart.disabled = !isHost && !roomState.players.some(p => p.isBot);
      btnStart.textContent = isHost ? 'Start Royal Match' : 'Waiting for Host...';
    }
  }

  function updateGameUI(roomState) {
    const codeBadge = document.getElementById('game-room-code');
    if (codeBadge) codeBadge.textContent = roomState.roomCode;

    // Corner Slots matching Ludo King bases
    const slotMap = {
      red: document.getElementById('slot-red'),
      green: document.getElementById('slot-green'),
      blue: document.getElementById('slot-blue'),
      yellow: document.getElementById('slot-yellow')
    };
    Object.values(slotMap).forEach(slot => { if (slot) slot.innerHTML = ''; });

    roomState.players.forEach(p => {
      const isCurrentTurn = (p.id === roomState.currentPlayerId);
      const isMe = (p.id === localPlayer?.id);
      const homeCount = p.tokens.filter(t => t.step === 56).length;

      const card = document.createElement('div');
      card.className = `player-card color-${p.color} ${isCurrentTurn ? 'active-turn' : ''} ${isMe ? 'is-me' : ''}`;
      card.setAttribute('data-player-id', p.id);

      card.innerHTML = `
        <div class="card-avatar-wrap" id="avatar-wrap-${p.id}">
          <div class="card-avatar">${p.avatar}</div>
          <div class="speaking-wave"></div>
          ${p.rank ? `<div class="rank-crown">#${p.rank}</div>` : ''}
        </div>
        <div class="card-details">
          <div class="card-header">
            <span class="card-name">${escapeHtml(p.name)} ${isMe ? '(You)' : ''}</span>
            <span class="mic-status-icon ${p.isMuted ? 'muted' : ''}">${p.isBot ? '🤖' : (p.isMuted ? '🔇' : '🎙️')}</span>
          </div>
          <div class="card-stats">
            <span class="home-stat">👑 ${homeCount}/4 Home</span>
            ${p.rank ? `<span class="finished-badge">Finished #${p.rank}</span>` : ''}
          </div>
          ${isCurrentTurn ? `
            <div class="turn-timer-wrap">
              <div class="turn-timer-bar" id="timer-bar-${p.id}"></div>
            </div>
          ` : ''}
        </div>
      `;

      // Click card to open individual volume control (if not me and not bot)
      if (!isMe && !p.isBot) {
        card.style.cursor = 'pointer';
        card.title = 'Click to adjust volume';
        card.addEventListener('click', () => openVolumePopup(p));
      }

      const targetSlot = slotMap[p.color];
      if (targetSlot) {
        targetSlot.appendChild(card);
      }

      // Animate timer countdown bar if current player
      if (isCurrentTurn) {
        const timerBar = document.getElementById(`timer-bar-${p.id}`);
        if (timerBar) {
          const pct = Math.max(0, Math.min(100, (roomState.turnTimeRemaining / 15) * 100));
          timerBar.style.width = `${pct}%`;
        }
      }
    });

    // Update dice instruction text
    const diceInstr = document.getElementById('dice-instruction');
    if (diceInstr) {
      if (roomState.currentPlayerId === localPlayer?.id) {
        diceInstr.textContent = '🎲 YOUR TURN! CLICK DICE';
        diceInstr.classList.add('pulse-instr');
      } else {
        const activeP = roomState.players.find(p => p.id === roomState.currentPlayerId);
        diceInstr.textContent = `${activeP?.name || 'Player'}'s turn...`;
        diceInstr.classList.remove('pulse-instr');
      }
    }
  }

  function updateAvatarSpeakingRing(peerId, isSpeaking) {
    const wrap = document.getElementById(`avatar-wrap-${peerId}`);
    if (wrap) {
      if (isSpeaking) {
        wrap.classList.add('speaking');
      } else {
        wrap.classList.remove('speaking');
      }
    }
  }

  function showTurnBanner(text) {
    const banner = document.getElementById('turn-status-banner');
    if (banner) {
      banner.textContent = text;
      banner.classList.remove('pop-anim');
      void banner.offsetWidth; // Trigger reflow
      banner.classList.add('pop-anim');
    }
  }

  function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `game-toast ${isError ? 'toast-error' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 20);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }

  function appendChatMessage(name, color, avatar, text) {
    if (!chatMessagesContainer) return;
    const msg = document.createElement('div');
    msg.className = `chat-bubble color-${color}`;
    msg.innerHTML = `
      <span class="chat-avatar">${avatar}</span>
      <div class="chat-content">
        <span class="chat-sender">${escapeHtml(name)}</span>
        <span class="chat-text">${escapeHtml(text)}</span>
      </div>
    `;
    chatMessagesContainer.appendChild(msg);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

    // Auto-remove after 8 seconds to prevent clutter
    setTimeout(() => {
      msg.style.opacity = '0';
      setTimeout(() => msg.remove(), 500);
    }, 8000);
  }

  function spawnFloatingEmoji(playerId, emoji) {
    const card = document.querySelector(`.player-card[data-player-id="${playerId}"]`);
    const rect = card ? card.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2 };

    const floater = document.createElement('div');
    floater.className = 'floating-emoji';
    floater.textContent = emoji;
    floater.style.left = `${rect.left + 30}px`;
    floater.style.top = `${rect.top + 10}px`;

    document.body.appendChild(floater);

    setTimeout(() => {
      floater.remove();
    }, 2000);
  }

  function handleGameOver(winners, roomState) {
    sound.playVictory();
    modalGameOver.classList.add('active');

    const podium = document.getElementById('podium-container');
    if (podium) {
      podium.innerHTML = '';
      winners.forEach((p, idx) => {
        const item = document.createElement('div');
        item.className = `podium-rank rank-${idx + 1}`;
        item.innerHTML = `
          <div class="podium-crown">${idx === 0 ? '🥇 👑' : (idx === 1 ? '🥈' : '🥉')}</div>
          <div class="podium-avatar">${p.avatar || '👑'}</div>
          <div class="podium-name">${escapeHtml(p.name)}</div>
          <div class="podium-place">Rank #${idx + 1}</div>
        `;
        podium.appendChild(item);
      });
    }

    // Launch celebratory confetti
    launchConfetti();
  }

  document.getElementById('btn-play-again')?.addEventListener('click', () => {
    modalGameOver.classList.remove('active');
    socket.emit('start-game');
  });

  document.getElementById('btn-return-lobby')?.addEventListener('click', () => {
    modalGameOver.classList.remove('active');
    showScreen('home');
    location.reload();
  });

  // Individual volume popup
  function openVolumePopup(player) {
    const popup = document.getElementById('modal-player-volume');
    if (!popup) return;
    document.getElementById('vol-player-name').textContent = player.name;
    const slider = document.getElementById('vol-slider');

    const curVol = voiceChat.peerVolumes.get(player.id) !== undefined
      ? voiceChat.peerVolumes.get(player.id)
      : 1.0;
    slider.value = Math.round(curVol * 100);

    slider.oninput = () => {
      const vol = parseFloat(slider.value) / 100;
      voiceChat.setPeerVolume(player.id, vol);
    };

    popup.classList.add('active');
  }

  document.getElementById('btn-close-volume')?.addEventListener('click', () => {
    document.getElementById('modal-player-volume').classList.remove('active');
  });

  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, (m) => {
      switch (m) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
      }
    });
  }

  // Celebratory Canvas Confetti
  function launchConfetti() {
    const canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = [];
    const colors = ['#FFD700', '#E53935', '#43A047', '#1E88E5', '#FDD835', '#FF4081', '#00E676'];

    for (let i = 0; i < 120; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height,
        w: Math.random() * 12 + 6,
        h: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vy: Math.random() * 3 + 2,
        vx: (Math.random() - 0.5) * 3,
        rot: Math.random() * 360,
        vrot: (Math.random() - 0.5) * 8
      });
    }

    let frames = 0;
    function anim() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      frames++;
      if (frames < 300) {
        requestAnimationFrame(anim);
      } else {
        canvas.remove();
      }
    }
    requestAnimationFrame(anim);
  }
});
