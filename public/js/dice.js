// 3D Animated Dice Engine for Ludo Voice King
// Renders realistic 3D dice rolling physics and handles face rotations.

class DiceRoller {
  constructor(containerId, onRollRequest) {
    this.container = document.getElementById(containerId);
    this.onRollRequest = onRollRequest;
    this.isRolling = false;
    this.currentValue = 1;
    this.canRoll = false;

    // Rotation angles for faces 1 through 6
    // [rotateX, rotateY]
    this.faceRotations = {
      1: { x: 0, y: 0 },
      2: { x: 0, y: 180 },
      3: { x: 0, y: -90 },
      4: { x: 0, y: 90 },
      5: { x: -90, y: 0 },
      6: { x: 90, y: 0 }
    };

    this.render();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = `
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
    `;

    this.cube = document.getElementById('dice-cube');
    this.wrapper = document.getElementById('dice-wrapper');

    this.wrapper.addEventListener('click', () => {
      if (this.canRoll && !this.isRolling) {
        if (this.onRollRequest) {
          this.onRollRequest();
        }
      }
    });
  }

  setCanRoll(enabled, playerColor = 'red') {
    this.canRoll = enabled;
    if (!this.wrapper) return;

    if (enabled) {
      this.wrapper.classList.add('can-roll', `color-${playerColor}`);
      this.wrapper.classList.remove('disabled');
    } else {
      this.wrapper.classList.remove('can-roll', 'color-red', 'color-green', 'color-yellow', 'color-blue');
      this.wrapper.classList.add('disabled');
    }
  }

  animateRoll(targetValue, onComplete) {
    if (this.isRolling || !this.cube) return;
    this.isRolling = true;
    this.currentValue = targetValue;

    if (window.soundEngine) {
      window.soundEngine.playDiceRoll();
    }

    // Add tumbling class for wild rotations
    this.wrapper.classList.add('is-shaking');
    this.cube.classList.add('is-spinning');

    // Random multiple full rotations (720 to 1440 deg)
    const extraRotX = (Math.floor(Math.random() * 3) + 2) * 360;
    const extraRotY = (Math.floor(Math.random() * 3) + 2) * 360;
    const targetRot = this.faceRotations[targetValue] || { x: 0, y: 0 };

    const finalX = extraRotX + targetRot.x;
    const finalY = extraRotY + targetRot.y;

    setTimeout(() => {
      this.cube.style.transform = `rotateX(${finalX}deg) rotateY(${finalY}deg)`;
      this.cube.classList.remove('is-spinning');
      this.wrapper.classList.remove('is-shaking');

      setTimeout(() => {
        this.isRolling = false;
        if (targetValue === 6 && window.soundEngine) {
          window.soundEngine.playBonusSix();
        }
        if (onComplete) onComplete(targetValue);
      }, 700);
    }, 450);
  }

  setFace(value) {
    if (!this.cube) return;
    const targetRot = this.faceRotations[value] || { x: 0, y: 0 };
    this.cube.style.transform = `rotateX(${targetRot.x}deg) rotateY(${targetRot.y}deg)`;
    this.currentValue = value;
  }
}

window.DiceRoller = DiceRoller;
