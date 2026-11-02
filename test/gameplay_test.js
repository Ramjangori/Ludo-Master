// Automated Integration Test for Ludo King + Voice Chat
const { io } = require('socket.io-client');
const http = require('http');

async function runIntegrationTest() {
  console.log('--- STARTING INTEGRATION TESTS ---');

  // Require server module or connect to running instance
  // We will start server on test port 3099
  process.env.PORT = '3099';
  const server = require('../server.js');

  const SERVER_URL = 'http://localhost:3099';

  // Wait 500ms for server to bind
  await new Promise(r => setTimeout(r, 600));

  console.log('1. Connecting Client 1 (Host)...');
  const client1 = io(SERVER_URL);

  let roomCode = null;
  let client1Joined = false;

  await new Promise((resolve) => {
    client1.on('connect', () => {
      console.log('Client 1 connected with id:', client1.id);
      client1.emit('create-room', {
        playerName: 'King_Tester',
        avatar: '👑',
        maxPlayers: 4,
        withBots: false
      });
    });

    client1.on('room-joined', ({ player, roomState }) => {
      console.log('✓ Client 1 joined room:', roomState.roomCode, 'Color:', player.color);
      roomCode = roomState.roomCode;
      client1Joined = true;
      resolve();
    });
  });

  console.log('2. Connecting Client 2 (Peer)...');
  const client2 = io(SERVER_URL);
  let client2Joined = false;

  await new Promise((resolve) => {
    client2.on('connect', () => {
      console.log('Client 2 connected with id:', client2.id);
      client2.emit('join-room', {
        roomCode: roomCode,
        playerName: 'Knight_Player',
        avatar: '🦁'
      });
    });

    client2.on('room-joined', ({ player, roomState }) => {
      console.log('✓ Client 2 joined room:', roomCode, 'Color:', player.color);
      client2Joined = true;
      resolve();
    });
  });

  console.log('3. Testing WebRTC Signaling Relay...');
  await new Promise((resolve) => {
    client2.on('voice-offer', ({ fromPeerId, offer }) => {
      console.log('✓ Client 2 received WebRTC offer from Client 1:', fromPeerId, offer.type);
      resolve();
    });

    client1.emit('voice-offer', {
      targetPeerId: client2.id,
      offer: { type: 'offer', sdp: 'dummy-sdp-data' }
    });
  });

  console.log('4. Testing Voice Speaking Status Relay...');
  await new Promise((resolve) => {
    client2.on('voice-speaking-status', ({ peerId, isSpeaking, volume }) => {
      console.log('✓ Client 2 received speaking status:', isSpeaking, 'volume:', volume);
      resolve();
    });

    client1.emit('voice-speaking', {
      isSpeaking: true,
      volume: 0.85
    });
  });

  console.log('5. Testing Chat and Reaction Broadcast...');
  await new Promise((resolve) => {
    client1.on('chat-message', ({ playerName, message }) => {
      console.log('✓ Client 1 received chat:', playerName, ':', message);
      resolve();
    });

    client2.emit('send-chat', { message: 'Ready for battle!' });
  });

  console.log('6. Testing Game Start and Turn Flow...');
  await new Promise((resolve) => {
    client1.on('game-started', ({ roomState }) => {
      console.log('✓ Game started! Status:', roomState.status, 'Total players:', roomState.players.length);
      console.log('  Active player turn:', roomState.currentPlayerId);
      resolve();
    });

    // Start game
    client1.emit('start-game');
  });

  console.log('7. Testing Dice Roll...');
  await new Promise((resolve) => {
    client1.on('dice-rolled', ({ playerId, value, validMoves }) => {
      console.log('✓ Dice rolled! Value:', value, 'Valid moves count:', validMoves.length);
      resolve();
    });

    client1.emit('roll-dice');
  });

  console.log('\n=======================================');
  console.log('🎉 ALL INTEGRATION TESTS PASSED 100%!');
  console.log('=======================================\n');

  client1.disconnect();
  client2.disconnect();
  process.exit(0);
}

runIntegrationTest().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
