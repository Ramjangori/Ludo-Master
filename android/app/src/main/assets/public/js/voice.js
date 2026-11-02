// WebRTC Voice Chat Engine with Audio Visualizer & Speaking Detection
// Supports P2P Audio Mesh for up to 4 players, Mic Mute, Deafen, and Push-to-Talk.

class VoiceChat {
  constructor(socket) {
    this.socket = socket;
    this.localStream = null;
    this.audioContext = null;
    this.analyser = null;
    this.audioLevelInterval = null;

    this.peerConnections = new Map(); // peerId -> RTCPeerConnection
    this.remoteAudioElements = new Map(); // peerId -> HTMLAudioElement

    this.isMicMuted = false;
    this.isDeafened = false;
    this.isPushToTalk = false;
    this.isPTTKeyDown = false;
    this.hasMicPermission = false;
    this.isSpeakingLocally = false;
    this.peerVolumes = new Map(); // peerId -> volume (0..1.5)

    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    };

    this.onSpeakingChangeCallback = null;
    this.onPeerListChangeCallback = null;
    this.onStatusChangeCallback = null;

    this.initSocketEvents();
    this.initKeyboardEvents();
  }

  initSocketEvents() {
    // When another peer is ready for voice
    this.socket.on('voice-peer-joined', async ({ peerId, player }) => {
      console.log(`[Voice] Peer joined voice: ${peerId} (${player?.name})`);
      if (this.localStream) {
        // As the existing peer, we initiate the call to the new peer
        await this.createPeerConnection(peerId, true);
      }
    });

    // Handle incoming WebRTC offer
    this.socket.on('voice-offer', async ({ fromPeerId, offer }) => {
      console.log(`[Voice] Received offer from ${fromPeerId}`);
      let pc = this.peerConnections.get(fromPeerId);
      if (!pc) {
        pc = await this.createPeerConnection(fromPeerId, false);
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.socket.emit('voice-answer', {
          targetPeerId: fromPeerId,
          answer: answer
        });
      } catch (err) {
        console.error('[Voice] Error answering offer:', err);
      }
    });

    // Handle incoming WebRTC answer
    this.socket.on('voice-answer', async ({ fromPeerId, answer }) => {
      console.log(`[Voice] Received answer from ${fromPeerId}`);
      const pc = this.peerConnections.get(fromPeerId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('[Voice] Error setting remote description:', err);
        }
      }
    });

    // Handle incoming ICE candidate
    this.socket.on('voice-ice-candidate', async ({ fromPeerId, candidate }) => {
      const pc = this.peerConnections.get(fromPeerId);
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('[Voice] Error adding ICE candidate:', err);
        }
      }
    });

    // Peer disconnected from voice
    this.socket.on('voice-peer-left', ({ peerId }) => {
      console.log(`[Voice] Peer left voice: ${peerId}`);
      this.closePeer(peerId);
    });

    // Speaking status broadcast from peer
    this.socket.on('voice-speaking-status', ({ peerId, isSpeaking, volume }) => {
      if (this.onSpeakingChangeCallback) {
        this.onSpeakingChangeCallback(peerId, isSpeaking, volume);
      }
    });

    // Mute/Deafen status from peers
    this.socket.on('voice-mute-status', ({ peerId, isMuted }) => {
      this.updatePeerMuteUI(peerId, isMuted);
    });
  }

  initKeyboardEvents() {
    // Push-to-Talk (PTT) with Spacebar
    window.addEventListener('keydown', (e) => {
      if (!this.isPushToTalk || e.code !== 'Space') return;
      // Ignore if user is typing in chat input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (!this.isPTTKeyDown) {
        this.isPTTKeyDown = true;
        this.unmuteMicTracks();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (!this.isPushToTalk || e.code !== 'Space') return;
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      this.isPTTKeyDown = false;
      this.muteMicTracks();
    });
  }

  async startVoice() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      this.localStream = stream;
      this.hasMicPermission = true;

      if (this.isPushToTalk) {
        this.muteMicTracks();
      }

      this.setupAudioAnalyser(stream);

      // Notify server we are ready for voice
      this.socket.emit('voice-ready');

      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback({ active: true, error: null });
      }

      return true;
    } catch (err) {
      console.warn('[Voice] Microphone access error or denied:', err);
      this.hasMicPermission = false;
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback({
          active: false,
          error: 'Microphone permission denied or no audio input found. You can still listen to others!'
        });
      }
      return false;
    }
  }

  setupAudioAnalyser(stream) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.4;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let speakingCounter = 0;

      clearInterval(this.audioLevelInterval);
      this.audioLevelInterval = setInterval(() => {
        if (this.isMicMuted || (this.isPushToTalk && !this.isPTTKeyDown)) {
          if (this.isSpeakingLocally) {
            this.isSpeakingLocally = false;
            this.broadcastSpeaking(false, 0);
          }
          this.updateLocalVoiceMeter(0);
          return;
        }

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(1, avg / 80);

        this.updateLocalVoiceMeter(normalized);

        const speakingThreshold = 0.12;
        if (normalized > speakingThreshold) {
          speakingCounter = Math.min(speakingCounter + 1, 5);
        } else {
          speakingCounter = Math.max(speakingCounter - 1, 0);
        }

        const isSpeakingNow = speakingCounter >= 2;
        if (isSpeakingNow !== this.isSpeakingLocally) {
          this.isSpeakingLocally = isSpeakingNow;
          this.broadcastSpeaking(isSpeakingNow, normalized);
        }
      }, 80);
    } catch (e) {
      console.warn('[Voice] Audio analyser setup failed:', e);
    }
  }

  broadcastSpeaking(isSpeaking, volume) {
    this.socket.emit('voice-speaking', {
      isSpeaking: isSpeaking,
      volume: volume
    });

    if (this.onSpeakingChangeCallback) {
      this.onSpeakingChangeCallback(this.socket.id, isSpeaking, volume);
    }
  }

  async createPeerConnection(peerId, isInitiator) {
    if (this.peerConnections.has(peerId)) {
      this.peerConnections.get(peerId).close();
    }

    const pc = new RTCPeerConnection(this.rtcConfig);
    this.peerConnections.set(peerId, pc);

    // Add local audio tracks
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('voice-ice-candidate', {
          targetPeerId: peerId,
          candidate: event.candidate
        });
      }
    };

    // Remote audio stream received
    pc.ontrack = (event) => {
      console.log(`[Voice] Remote audio track received from ${peerId}`);
      this.setupRemoteAudio(peerId, event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      console.log(`[Voice] Peer ${peerId} connection state:`, pc.connectionState);
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        this.closePeer(peerId);
      }
    };

    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.socket.emit('voice-offer', {
          targetPeerId: peerId,
          offer: offer
        });
      } catch (err) {
        console.error('[Voice] Error creating offer:', err);
      }
    }

    return pc;
  }

  setupRemoteAudio(peerId, stream) {
    let audio = this.remoteAudioElements.get(peerId);
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = `remote-audio-${peerId}`;
      audio.autoplay = true;
      audio.playsInline = true;
      document.body.appendChild(audio);
      this.remoteAudioElements.set(peerId, audio);
    }

    audio.srcObject = stream;
    const vol = this.peerVolumes.has(peerId) ? this.peerVolumes.get(peerId) : 1.0;
    audio.volume = this.isDeafened ? 0 : Math.min(1.0, vol);

    audio.play().catch(e => {
      console.log('[Voice] Autoplay was prevented; waiting for user gesture:', e);
    });
  }

  toggleMic() {
    if (!this.localStream) {
      this.startVoice();
      return true;
    }

    this.isMicMuted = !this.isMicMuted;
    if (this.isMicMuted) {
      this.muteMicTracks();
    } else {
      this.unmuteMicTracks();
    }

    this.socket.emit('voice-mute-toggle', { isMuted: this.isMicMuted });
    return !this.isMicMuted;
  }

  muteMicTracks() {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => track.enabled = false);
    }
  }

  unmuteMicTracks() {
    if (this.localStream && !this.isMicMuted) {
      this.localStream.getAudioTracks().forEach(track => track.enabled = true);
    }
  }

  toggleDeafen() {
    this.isDeafened = !this.isDeafened;
    this.remoteAudioElements.forEach((audio, peerId) => {
      const vol = this.peerVolumes.has(peerId) ? this.peerVolumes.get(peerId) : 1.0;
      audio.volume = this.isDeafened ? 0 : Math.min(1.0, vol);
    });

    this.socket.emit('voice-deafen-toggle', { isDeafened: this.isDeafened });
    return this.isDeafened;
  }

  setPeerVolume(peerId, volume) {
    this.peerVolumes.set(peerId, volume);
    const audio = this.remoteAudioElements.get(peerId);
    if (audio && !this.isDeafened) {
      audio.volume = Math.max(0, Math.min(1.0, volume));
    }
  }

  togglePushToTalk(enable) {
    this.isPushToTalk = enable;
    if (this.isPushToTalk) {
      this.muteMicTracks();
    } else if (!this.isMicMuted) {
      this.unmuteMicTracks();
    }
    return this.isPushToTalk;
  }

  updateLocalVoiceMeter(normalizedLevel) {
    const meter = document.getElementById('voice-level-bar');
    if (meter) {
      meter.style.width = `${Math.round(normalizedLevel * 100)}%`;
      if (normalizedLevel > 0.15) {
        meter.classList.add('active');
      } else {
        meter.classList.remove('active');
      }
    }
  }

  updatePeerMuteUI(peerId, isMuted) {
    const card = document.querySelector(`.player-card[data-player-id="${peerId}"]`);
    if (card) {
      const micIcon = card.querySelector('.mic-status-icon');
      if (micIcon) {
        micIcon.textContent = isMuted ? '🔇' : '🎙️';
        micIcon.title = isMuted ? 'Player Muted' : 'Mic Active';
        if (isMuted) {
          micIcon.classList.add('muted');
        } else {
          micIcon.classList.remove('muted');
        }
      }
    }
  }

  closePeer(peerId) {
    if (this.peerConnections.has(peerId)) {
      this.peerConnections.get(peerId).close();
      this.peerConnections.delete(peerId);
    }
    if (this.remoteAudioElements.has(peerId)) {
      const audio = this.remoteAudioElements.get(peerId);
      audio.srcObject = null;
      audio.remove();
      this.remoteAudioElements.delete(peerId);
    }
  }

  destroy() {
    clearInterval(this.audioLevelInterval);
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    this.remoteAudioElements.forEach(audio => audio.remove());
    this.remoteAudioElements.clear();
  }
}

window.VoiceChat = VoiceChat;
