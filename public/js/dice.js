// Ultra-Juicy 3D Animated Dice Controller for Ludo King
// Tactile Feedback, Haptics, High-Energy Rolling, and Punchy Number Reveal.

class DiceRoller {
  constructor(containerId, onRollRequest) {
    this.container = document.getElementById(containerId);
    this.onRollRequest = onRollRequest;
    this.isRolling = false;
    this.currentValue = 1;
    this.canRoll = false;

    // Exact rotation angles for faces 1 through 6
    this.faceRotations = {
      1: { x: 0, y: 0 },
      2: { x: 0, y: 180 },
      3: { x: 0, y: -90 },
      4: { x: 0, y: 90 },
      5: { x: -90, y: 0 },
      6: { x: 90, y: 0 }
    };

    this.render();
    this.setupKeyboard();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="dice-box-card" id="dice-box-card">
        <div class="dice-wrapper" id="dice-wrapper">
          <div class="dice-cup" id="dice-cup">
            <div class="cube" id="dice-cube">
              <div class="cube-face face-1">
                <span class="pip pip-center"></span>
              </div>
              <div class="cube-face face-2">
                <span class="pip pip-top-left"></span>
                <span class="pip pip-bottom-right"></span>
              </div>
              <div class="cube-face face-3">
                <span class="pip pip-top-left"></span>
                <span class="pip pip-center"></span>
                <span class="pip pip-bottom-right"></span>
              </div>
              <div class="cube-face face-4">
                <span class="pip pip-top-left"></span>
                <span class="pip pip-top-right"></span>
                <span class="pip pip-bottom-left"></span>
                <span class="pip pip-bottom-right"></span>
              </div>
              <div class="cube-face face-5">
                <span class="pip pip-top-left"></span>
                <span class="pip pip-top-right"></span>
                <span class="pip pip-center"></span>
                <span class="pip pip-bottom-left"></span>
                <span class="pip pip-bottom-right"></span>
              </div>
              <div class="cube-face face-6">
                <span class="pip pip-top-left"></span>
                <span class="pip pip-top-right"></span>
                <span class="pip pip-mid-left"></span>
                <span class="pip pip-mid-right"></span>
                <span class="pip pip-bottom-left"></span>
                <span class="pip pip-bottom-right"></span>
              </div>
            </div>
          </div>
          <div class="dice-glow" id="dice-glow"></div>
        </div>

        <button class="roll-trigger-btn" id="btn-roll-trigger">
          <span class="btn-roll-text">🎲 ROLL</span>
          <span class="btn-roll-sub">Spacebar</span>
        </button>
      </div>
    `;

    this.cube = document.getElementById('dice-cube');
    this.wrapper = document.getElementById('dice-wrapper');
    this.boxCard = document.getElementById('dice-box-card');
    this.rollBtn = document.getElementById('btn-roll-trigger');

    const handleTrigger = (e) => {
      e?.preventDefault();
      if (this.canRoll && !this.isRolling) {
        if (navigator.vibrate) {
          navigator.vibrate(40);
        }
        if (this.onRollRequest) {
          this.onRollRequest();
        }
      }
    };

    this.boxCard.addEventListener('click', handleTrigger);
    this.rollBtn.addEventListener('click', handleTrigger);
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        if (this.canRoll && !this.isRolling) {
          e.preventDefault();
          if (navigator.vibrate) navigator.vibrate(40);
          if (this.onRollRequest) this.onRollRequest();
        }
      }
    });
  }

  setCanRoll(enabled, playerColor = 'red') {
    this.canRoll = enabled;
    if (!this.boxCard || !this.rollBtn) return;

    if (enabled) {
      this.boxCard.classList.add('can-roll', `color-${playerColor}`);
      this.boxCard.classList.remove('disabled');
      this.rollBtn.classList.add('active', `color-${playerColor}`);
      this.rollBtn.classList.remove('disabled');
      this.rollBtn.querySelector('.btn-roll-text').textContent = '🎲 TAP TO ROLL!';
    } else {
      this.boxCard.classList.remove('can-roll', 'color-red', 'color-green', 'color-yellow', 'color-blue');
      this.boxCard.classList.add('disabled');
      this.rollBtn.classList.remove('active', 'color-red', 'color-green', 'color-yellow', 'color-blue');
      this.rollBtn.classList.add('disabled');
      this.rollBtn.querySelector('.btn-roll-text').textContent = 'WAITING...';
    }
  }

  animateRoll(targetValue, onComplete) {
    if (this.isRolling || !this.cube) return;
    this.isRolling = true;
    this.currentValue = targetValue;

    if (window.soundEngine) {
      window.soundEngine.playDiceRoll();
    }

    if (navigator.vibrate) {
      navigator.vibrate([20, 30, 40]);
    }

    // High energy tumble
    this.boxCard.classList.add('is-shaking');
    this.cube.classList.add('is-spinning');

    // 720 to 1080 deg rotation
    const extraRotX = (Math.floor(Math.random() * 2) + 2) * 360;
    const extraRotY = (Math.floor(Math.random() * 2) + 2) * 360;
    const targetRot = this.faceRotations[targetValue] || { x: 0, y: 0 };

    const finalX = extraRotX + targetRot.x;
    const finalY = extraRotY + targetRot.y;

    // Fast, punchy tumble duration (320ms)
    setTimeout(() => {
      this.cube.style.transform = `rotateX(${finalX}deg) rotateY(${finalY}deg)`;
      this.cube.classList.remove('is-spinning');
      this.boxCard.classList.remove('is-shaking');

      // Punch slam effect
      this.cube.classList.add('slam-impact');
      setTimeout(() => this.cube.classList.remove('slam-impact'), 250);

      setTimeout(() => {
        this.isRolling = false;
        if (targetValue === 6) {
          if (window.soundEngine) window.soundEngine.playBonusSix();
          if (navigator.vibrate) navigator.vibrate([50, 50, 80]);
        }
        if (onComplete) onComplete(targetValue);
      }, 280);
    }, 320);
  }

  setFace(value) {
    if (!this.cube) return;
    const targetRot = this.faceRotations[value] || { x: 0, y: 0 };
    this.cube.style.transform = `rotateX(${targetRot.x}deg) rotateY(${targetRot.y}deg)`;
    this.currentValue = value;
  }
}

window.DiceRoller = DiceRoller;
