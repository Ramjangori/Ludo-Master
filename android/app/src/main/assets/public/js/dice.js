// High-Performance Tactile Dice Controller for Ludo King
// Instant local tumble on tap (zero perceived lag), authoritative landing, zero face-glitches.

class DiceRoller {
  constructor(containerId, onRollRequest) {
    this.container = document.getElementById(containerId);
    this.onRollRequest = onRollRequest;
    this.isRolling = false;
    this.currentValue = 1;
    this.canRoll = false;
    this.tumbleInterval = null;
    this.pendingSettleValue = null;
    this.rollStartTime = 0;
    this.onCompleteCallback = null;

    // Pip layouts for faces 1 to 6
    this.pipLayouts = {
      1: '<span class="pip pip-center red-pip"></span>',
      2: '<span class="pip pip-top-left"></span><span class="pip pip-bottom-right"></span>',
      3: '<span class="pip pip-top-left"></span><span class="pip pip-center"></span><span class="pip pip-bottom-right"></span>',
      4: '<span class="pip pip-top-left"></span><span class="pip pip-top-right"></span><span class="pip pip-bottom-left"></span><span class="pip pip-bottom-right"></span>',
      5: '<span class="pip pip-top-left"></span><span class="pip pip-top-right"></span><span class="pip pip-center"></span><span class="pip pip-bottom-left"></span><span class="pip pip-bottom-right"></span>',
      6: '<span class="pip pip-top-left"></span><span class="pip pip-top-right"></span><span class="pip pip-mid-left"></span><span class="pip pip-mid-right"></span><span class="pip pip-bottom-left"></span><span class="pip pip-bottom-right"></span>'
    };

    this.render();
    this.setupKeyboard();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="dice-box-card" id="dice-box-card">
        <div class="dice-wrapper" id="dice-wrapper">
          <div class="dice-face-display" id="dice-face-display">
            ${this.pipLayouts[1]}
          </div>
          <div class="dice-glow" id="dice-glow"></div>
        </div>

        <div class="dice-action-wrap">
          <div class="dice-result-badge" id="dice-result-badge">
            <span class="result-number">1</span>
          </div>
          <button class="roll-trigger-btn" id="btn-roll-trigger">
            <span class="btn-roll-text">🎲 TAP TO ROLL</span>
          </button>
        </div>
      </div>
    `;

    this.boxCard = document.getElementById('dice-box-card');
    this.wrapper = document.getElementById('dice-wrapper');
    this.faceDisplay = document.getElementById('dice-face-display');
    this.resultBadge = document.getElementById('dice-result-badge');
    this.rollBtn = document.getElementById('btn-roll-trigger');

    const handleTrigger = (e) => {
      e?.preventDefault();
      e?.stopPropagation();
      if (this.canRoll && !this.isRolling) {
        this.triggerLocalRoll();
      }
    };

    this.boxCard.addEventListener('click', handleTrigger);
    this.boxCard.addEventListener('touchstart', handleTrigger, { passive: false });
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
        if (this.canRoll && !this.isRolling) {
          e.preventDefault();
          this.triggerLocalRoll();
        }
      }
    });
  }

  triggerLocalRoll() {
    if (this.isRolling) return;
    this.isRolling = true;
    this.canRoll = false;
    this.pendingSettleValue = null;
    this.rollStartTime = performance.now();

    // Instant tactile feedback
    if (navigator.vibrate) navigator.vibrate(40);
    if (window.soundEngine) window.soundEngine.playDiceRoll();

    // Immediate local tumble animation (zero network lag feel!)
    this.startTumbleAnimation();

    // Update button display
    if (this.rollBtn) {
      this.rollBtn.classList.remove('active');
      this.rollBtn.classList.add('disabled');
      const txt = this.rollBtn.querySelector('.btn-roll-text');
      if (txt) txt.textContent = 'ROLLING...';
    }

    // Emit to server
    if (this.onRollRequest) {
      this.onRollRequest();
    }
  }

  startTumbleAnimation() {
    if (this.tumbleInterval) clearInterval(this.tumbleInterval);
    this.boxCard?.classList.add('is-rolling-active');
    this.faceDisplay?.classList.add('is-tumbling');
    if (this.resultBadge) {
      this.resultBadge.classList.add('tumbling');
      this.resultBadge.querySelector('.result-number').textContent = '🎲';
    }

    let tumbleStep = 0;
    this.tumbleInterval = setInterval(() => {
      tumbleStep++;
      const randomFace = (Math.floor(Math.random() * 6) + 1);
      if (this.faceDisplay) {
        this.faceDisplay.innerHTML = this.pipLayouts[randomFace];
        const rot = (tumbleStep * 45) % 360;
        const tiltX = (Math.sin(tumbleStep) * 18);
        const tiltY = (Math.cos(tumbleStep) * 18);
        this.faceDisplay.style.transform = `rotate(${rot}deg) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.12)`;
      }

      // Check if server value arrived and minimum tumble time (350ms) has passed
      if (this.pendingSettleValue !== null && (performance.now() - this.rollStartTime >= 350)) {
        this.finishSettle(this.pendingSettleValue);
      }
    }, 45);
  }

  // Called when server sends the rolled dice value
  animateRoll(targetValue, onComplete) {
    this.onCompleteCallback = onComplete;
    this.pendingSettleValue = targetValue;

    if (!this.isRolling) {
      // Opponent/Bot roll: start tumble now and settle
      this.isRolling = true;
      this.rollStartTime = performance.now();
      if (window.soundEngine) window.soundEngine.playDiceRoll();
      this.startTumbleAnimation();
    } else {
      // Local player roll: if already rolling, finishSettle will trigger as soon as min time elapsed
      if (performance.now() - this.rollStartTime >= 350) {
        this.finishSettle(targetValue);
      }
    }
  }

  finishSettle(finalValue) {
    if (this.tumbleInterval) {
      clearInterval(this.tumbleInterval);
      this.tumbleInterval = null;
    }

    this.currentValue = finalValue;
    this.pendingSettleValue = null;

    if (this.faceDisplay) {
      this.faceDisplay.innerHTML = this.pipLayouts[finalValue] || this.pipLayouts[1];
      this.faceDisplay.style.transform = 'rotate(0deg) rotateX(0deg) rotateY(0deg) scale(1)';
      this.faceDisplay.classList.remove('is-tumbling');
      this.faceDisplay.classList.add('impact-slam');
      setTimeout(() => this.faceDisplay?.classList.remove('impact-slam'), 300);
    }

    this.boxCard?.classList.remove('is-rolling-active');

    // Update result badge with glowing settled number
    if (this.resultBadge) {
      this.resultBadge.classList.remove('tumbling');
      this.resultBadge.classList.add('settled');
      this.resultBadge.querySelector('.result-number').textContent = finalValue;
      setTimeout(() => this.resultBadge?.classList.remove('settled'), 400);
    }

    // Sound and haptics on landing
    if (finalValue === 6) {
      if (window.soundEngine) window.soundEngine.playBonusSix();
      if (navigator.vibrate) navigator.vibrate([60, 40, 80]);
      this.boxCard?.classList.add('gold-six-glow');
      setTimeout(() => this.boxCard?.classList.remove('gold-six-glow'), 1200);
    } else {
      if (navigator.vibrate) navigator.vibrate(30);
    }

    setTimeout(() => {
      this.isRolling = false;
      if (this.onCompleteCallback) {
        const cb = this.onCompleteCallback;
        this.onCompleteCallback = null;
        cb(finalValue);
      }
    }, 220);
  }

  setCanRoll(enabled, playerColor = 'red') {
    this.canRoll = enabled;
    if (!this.boxCard || !this.rollBtn) return;

    if (enabled && !this.isRolling) {
      this.boxCard.classList.add('can-roll', `color-${playerColor}`);
      this.boxCard.classList.remove('disabled');
      this.rollBtn.classList.add('active', `color-${playerColor}`);
      this.rollBtn.classList.remove('disabled');
      const txt = this.rollBtn.querySelector('.btn-roll-text');
      if (txt) txt.textContent = '🎲 YOUR TURN! ROLL';
    } else if (!enabled) {
      this.boxCard.classList.remove('can-roll', 'color-red', 'color-green', 'color-yellow', 'color-blue');
      this.boxCard.classList.add('disabled');
      this.rollBtn.classList.remove('active', 'color-red', 'color-green', 'color-yellow', 'color-blue');
      this.rollBtn.classList.add('disabled');
      const txt = this.rollBtn.querySelector('.btn-roll-text');
      if (txt) txt.textContent = 'WAITING...';
    }
  }

  setFace(value) {
    if (!this.faceDisplay) return;
    this.currentValue = value;
    this.faceDisplay.innerHTML = this.pipLayouts[value] || this.pipLayouts[1];
    this.faceDisplay.style.transform = 'none';
    if (this.resultBadge) {
      this.resultBadge.querySelector('.result-number').textContent = value;
    }
  }
}

window.DiceRoller = DiceRoller;
