// Authentic Ludo King Canvas Board Renderer
// High-DPI, 3D Pawns with Bouncing Arrows, Star Tiles, Home Corridors, and Multi-Token Clustering.

class LudoBoard {
  constructor(canvasId, onTokenClick) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.onTokenClick = onTokenClick;

    this.gridSize = 15;
    this.cellSize = 0;
    this.width = 0;
    this.height = 0;

    // 52 Perimeter track coordinates (clockwise order from Red Start)
    this.trackCoords = [
      { c: 1, r: 6 },  // 0  (Red Start, Safe)
      { c: 2, r: 6 },  // 1
      { c: 3, r: 6 },  // 2
      { c: 4, r: 6 },  // 3
      { c: 5, r: 6 },  // 4
      { c: 6, r: 5 },  // 5
      { c: 6, r: 4 },  // 6
      { c: 6, r: 3 },  // 7
      { c: 6, r: 2 },  // 8  (Safe Star)
      { c: 6, r: 1 },  // 9
      { c: 6, r: 0 },  // 10
      { c: 7, r: 0 },  // 11
      { c: 8, r: 0 },  // 12
      { c: 8, r: 1 },  // 13 (Green Start, Safe)
      { c: 8, r: 2 },  // 14
      { c: 8, r: 3 },  // 15
      { c: 8, r: 4 },  // 16
      { c: 8, r: 5 },  // 17
      { c: 9, r: 6 },  // 18
      { c: 10, r: 6 }, // 19
      { c: 11, r: 6 }, // 20
      { c: 12, r: 6 }, // 21 (Safe Star)
      { c: 13, r: 6 }, // 22
      { c: 14, r: 6 }, // 23
      { c: 14, r: 7 }, // 24
      { c: 14, r: 8 }, // 25
      { c: 13, r: 8 }, // 26 (Yellow Start, Safe)
      { c: 12, r: 8 }, // 27
      { c: 11, r: 8 }, // 28
      { c: 10, r: 8 }, // 29
      { c: 9, r: 8 },  // 30
      { c: 8, r: 9 },  // 31
      { c: 8, r: 10 }, // 32
      { c: 8, r: 11 }, // 33
      { c: 8, r: 12 }, // 34 (Safe Star)
      { c: 8, r: 13 }, // 35
      { c: 8, r: 14 }, // 36
      { c: 7, r: 14 }, // 37
      { c: 6, r: 14 }, // 38
      { c: 6, r: 13 }, // 39 (Blue Start, Safe)
      { c: 6, r: 12 }, // 40
      { c: 6, r: 11 }, // 41
      { c: 6, r: 10 }, // 42
      { c: 6, r: 9 },  // 43
      { c: 5, r: 8 },  // 44
      { c: 4, r: 8 },  // 45
      { c: 3, r: 8 },  // 46
      { c: 2, r: 8 },  // 47 (Safe Star)
      { c: 1, r: 8 },  // 48
      { c: 0, r: 8 },  // 49
      { c: 0, r: 7 },  // 50
      { c: 0, r: 6 }   // 51
    ];

    // Home straight corridors (steps 51 to 55)
    this.homeStraights = {
      red: [
        { c: 1, r: 7 }, { c: 2, r: 7 }, { c: 3, r: 7 }, { c: 4, r: 7 }, { c: 5, r: 7 }
      ],
      green: [
        { c: 7, r: 1 }, { c: 7, r: 2 }, { c: 7, r: 3 }, { c: 7, r: 4 }, { c: 7, r: 5 }
      ],
      yellow: [
        { c: 13, r: 7 }, { c: 12, r: 7 }, { c: 11, r: 7 }, { c: 10, r: 7 }, { c: 9, r: 7 }
      ],
      blue: [
        { c: 7, r: 13 }, { c: 7, r: 12 }, { c: 7, r: 11 }, { c: 7, r: 10 }, { c: 7, r: 9 }
      ]
    };

    // Yard pedestal positions inside the 6x6 bases
    this.yardPositions = {
      red: [
        { c: 1.5, r: 1.5 }, { c: 3.5, r: 1.5 },
        { c: 1.5, r: 3.5 }, { c: 3.5, r: 3.5 }
      ],
      green: [
        { c: 10.5, r: 1.5 }, { c: 12.5, r: 1.5 },
        { c: 10.5, r: 3.5 }, { c: 12.5, r: 3.5 }
      ],
      yellow: [
        { c: 10.5, r: 10.5 }, { c: 12.5, r: 10.5 },
        { c: 10.5, r: 12.5 }, { c: 12.5, r: 12.5 }
      ],
      blue: [
        { c: 1.5, r: 10.5 }, { c: 3.5, r: 10.5 },
        { c: 1.5, r: 12.5 }, { c: 3.5, r: 12.5 }
      ]
    };

    // Center victory home pedestals
    this.homeGoalPositions = {
      red: [
        { c: 6.3, r: 6.8 }, { c: 6.7, r: 6.8 },
        { c: 6.3, r: 7.2 }, { c: 6.7, r: 7.2 }
      ],
      green: [
        { c: 6.8, r: 6.3 }, { c: 7.2, r: 6.3 },
        { c: 6.8, r: 6.7 }, { c: 7.2, r: 6.7 }
      ],
      yellow: [
        { c: 7.3, r: 6.8 }, { c: 7.7, r: 6.8 },
        { c: 7.3, r: 7.2 }, { c: 7.7, r: 7.2 }
      ],
      blue: [
        { c: 6.8, r: 7.3 }, { c: 7.2, r: 7.3 },
        { c: 6.8, r: 7.7 }, { c: 7.2, r: 7.7 }
      ]
    };

    this.startIndex = {
      red: 0,
      green: 13,
      yellow: 26,
      blue: 39
    };

    // 8 Safe Squares
    this.safeSquares = [0, 8, 13, 21, 26, 34, 39, 47];

    // Authentic Ludo King color palette
    this.palette = {
      red: '#D32F2F',
      redDark: '#8E0000',
      redLight: '#FFCDD2',
      green: '#2E7D32',
      greenDark: '#005005',
      greenLight: '#C8E6C9',
      yellow: '#FBC02D',
      yellowDark: '#C49000',
      yellowLight: '#FFF9C4',
      blue: '#1976D2',
      blueDark: '#004BA0',
      blueLight: '#BBDEFB',
      white: '#FFFFFF',
      cellBorder: '#D7CCC8',
      gold: '#FFD700',
      boardWood: '#24140E',
      trackBg: '#FFFDF9'
    };

    // Animation & State
    this.animatingTokens = new Map();
    this.hoveredToken = null;
    this.validTokenMoves = [];
    this.activePlayerId = null;
    this.localPlayerId = null;
    this.gameState = null;

    this.setupResize();
    this.setupEvents();
    this.startRenderLoop();
  }

  setupResize() {
    this.resize = () => {
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;

      // On mobile portrait, board size must leave room for header, top row, bottom row and padding
      const availableH = Math.max(260, screenH - 240);
      const availableW = Math.max(260, screenW - 16);
      const size = Math.floor(Math.min(availableW, availableH, 560));

      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.width = size;
      this.height = size;
      this.canvas.width = Math.round(size * dpr);
      this.canvas.height = Math.round(size * dpr);
      this.canvas.style.width = `${size}px`;
      this.canvas.style.height = `${size}px`;

      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
      this.cellSize = size / this.gridSize;
    };

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  setupEvents() {
    let lastTouchTime = 0;

    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.width / (rect.width || 1);
      const scaleY = this.height / (rect.height || 1);
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      return { x, y };
    };

    this.canvas.addEventListener('mousemove', (e) => {
      const { x, y } = getPos(e);
      this.handleHover(x, y);
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoveredToken = null;
      this.canvas.style.cursor = 'default';
    });

    this.canvas.addEventListener('click', (e) => {
      if (performance.now() - lastTouchTime < 400) return;
      const { x, y } = getPos(e);
      this.handleClick(x, y);
    });

    // Touch support for mobile devices
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        lastTouchTime = performance.now();
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.width / (rect.width || 1);
        const scaleY = this.height / (rect.height || 1);
        const x = (touch.clientX - rect.left) * scaleX;
        const y = (touch.clientY - rect.top) * scaleY;
        this.handleClick(x, y);
      }
    }, { passive: true });
  }

  startRenderLoop() {
    const render = () => {
      this.draw();
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  updateState(roomState, localPlayerId) {
    this.gameState = roomState;
    this.localPlayerId = localPlayerId;
    this.activePlayerId = roomState.currentPlayerId;
    this.validTokenMoves = roomState.validMoves || [];
    if (!this.cellSize || this.cellSize <= 0) {
      this.resize();
    }
  }

  getCoordinateForToken(color, tokenId, step) {
    if (step === -1) {
      return this.yardPositions[color][tokenId];
    }
    if (step >= 0 && step <= 50) {
      const trackIdx = (this.startIndex[color] + step) % 52;
      return this.trackCoords[trackIdx];
    }
    if (step >= 51 && step <= 55) {
      return this.homeStraights[color][step - 51];
    }
    if (step === 56) {
      return this.homeGoalPositions[color][tokenId];
    }
    return { c: 7, r: 7 };
  }

  animateTokenMove(playerColor, tokenId, fromStep, toStep, onComplete) {
    const key = `${playerColor}-${tokenId}`;
    const steps = [];

    if (fromStep === -1) {
      steps.push(0);
    } else {
      for (let s = fromStep + 1; s <= toStep; s++) {
        steps.push(s);
      }
    }

    let currentStepIdx = 0;
    const playNextHop = () => {
      if (currentStepIdx >= steps.length) {
        this.animatingTokens.delete(key);
        if (onComplete) onComplete();
        return;
      }

      const targetStep = steps[currentStepIdx];
      const fromCoord = currentStepIdx === 0
        ? this.getCoordinateForToken(playerColor, tokenId, fromStep)
        : this.getCoordinateForToken(playerColor, tokenId, steps[currentStepIdx - 1]);
      const toCoord = this.getCoordinateForToken(playerColor, tokenId, targetStep);

      const hopDuration = 120;
      const startTime = performance.now();

      if (window.soundEngine) {
        window.soundEngine.playTokenStep();
      }

      const updateHop = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / hopDuration);

        this.animatingTokens.set(key, {
          playerColor,
          tokenId,
          fromCoord,
          toCoord,
          progress,
          arcHeight: 0.45
        });

        if (progress < 1) {
          requestAnimationFrame(updateHop);
        } else {
          currentStepIdx++;
          playNextHop();
        }
      };

      requestAnimationFrame(updateHop);
    };

    playNextHop();
  }

  draw() {
    if (!this.ctx) return;
    if (!this.cellSize || this.cellSize <= 0) {
      this.resize();
      if (!this.cellSize || this.cellSize <= 0) return;
    }

    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Wood Outer Border & Royal Frame
    this.drawBoardBase();

    // 2. 4 Corner Bases (Yards)
    this.drawYard(0, 0, 'red', 'Red Empress');
    this.drawYard(9, 0, 'green', 'Green Knight');
    this.drawYard(9, 9, 'yellow', 'Yellow Monarch');
    this.drawYard(0, 9, 'blue', 'Blue Baron');

    // 3. Track Cells & Colored Starting Squares & Safe Stars
    this.drawTrackCells();

    // 4. Center Victory Home Area
    this.drawCenterHome();

    // 5. Authentic 3D Tokens
    this.drawAllTokens();
  }

  drawBoardBase() {
    const cs = this.cellSize;
    const totalSize = cs * this.gridSize;

    // Rich Mahogany Wood Border
    this.ctx.fillStyle = this.palette.boardWood;
    this.ctx.fillRect(0, 0, totalSize, totalSize);

    // Gold Inlay Border
    this.ctx.strokeStyle = this.palette.gold;
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeRect(3, 3, totalSize - 6, totalSize - 6);

    // Board Surface
    this.ctx.fillStyle = this.palette.trackBg;
    this.ctx.fillRect(cs * 0.08, cs * 0.08, totalSize - cs * 0.16, totalSize - cs * 0.16);
  }

  drawYard(startCol, startRow, color, label) {
    const cs = this.cellSize;
    const x = startCol * cs;
    const y = startRow * cs;
    const yardSize = cs * 6;

    // Yard Solid Gradient
    const grad = this.ctx.createLinearGradient(x, y, x + yardSize, y + yardSize);
    grad.addColorStop(0, this.palette[color]);
    grad.addColorStop(1, this.palette[`${color}Dark`]);

    this.ctx.fillStyle = grad;
    this.ctx.fillRect(x, y, yardSize, yardSize);

    // Golden inner border
    this.ctx.strokeStyle = this.palette.gold;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x + 2, y + 2, yardSize - 4, yardSize - 4);

    // Large White Inner Square for holding base
    const innerPadding = cs * 0.95;
    const innerX = x + innerPadding;
    const innerY = y + innerPadding;
    const innerSize = yardSize - innerPadding * 2;

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.shadowColor = 'rgba(0,0,0,0.3)';
    this.ctx.shadowBlur = 6;
    this.ctx.fillRect(innerX, innerY, innerSize, innerSize);
    this.ctx.shadowBlur = 0;

    // Inner racetrack ring
    this.ctx.strokeStyle = this.palette[color];
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(innerX + 4, innerY + 4, innerSize - 8, innerSize - 8);

    // 4 Pedestals for pawns
    const positions = this.yardPositions[color];
    positions.forEach((pos) => {
      const cx = (pos.c + 0.5) * cs;
      const cy = (pos.r + 0.5) * cs;
      const radius = cs * 0.45;

      // Shadow
      this.ctx.beginPath();
      this.ctx.arc(cx, cy + 1, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(0,0,0,0.15)';
      this.ctx.fill();

      // Pedestal Base
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = this.palette[`${color}Light`];
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = this.palette[color];
      this.ctx.lineWidth = 2.5;
      this.ctx.stroke();
    });
  }

  drawTrackCells() {
    const cs = this.cellSize;

    for (let c = 0; c < 15; c++) {
      for (let r = 0; r < 15; r++) {
        // Skip corner bases and center 3x3
        const inYard = (c < 6 && r < 6) || (c > 8 && r < 6) || (c > 8 && r > 8) || (c < 6 && r > 8);
        const inCenter = (c >= 6 && c <= 8 && r >= 6 && r <= 8);
        if (inYard || inCenter) continue;

        const x = c * cs;
        const y = r * cs;

        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(x, y, cs, cs);

        this.ctx.strokeStyle = this.palette.cellBorder;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, cs, cs);
      }
    }

    // Color Home Straights (5 squares each leading into center)
    this.colorPath(this.homeStraights.red, 'red', 'right');
    this.colorPath(this.homeStraights.green, 'green', 'down');
    this.colorPath(this.homeStraights.yellow, 'yellow', 'left');
    this.colorPath(this.homeStraights.blue, 'blue', 'up');

    // Color Starting Cells
    this.colorCell(1, 6, 'red');
    this.colorCell(8, 1, 'green');
    this.colorCell(13, 8, 'yellow');
    this.colorCell(6, 13, 'blue');

    // Starting Arrows
    this.drawStartArrow(1, 6, 'right');
    this.drawStartArrow(8, 1, 'down');
    this.drawStartArrow(13, 8, 'left');
    this.drawStartArrow(6, 13, 'up');

    // Safe Stars (8 safe squares)
    this.safeSquares.forEach(idx => {
      const coord = this.trackCoords[idx];
      this.drawSafeStar((coord.c + 0.5) * cs, (coord.r + 0.5) * cs, cs * 0.36);
    });
  }

  colorPath(coords, color, arrowDir) {
    const cs = this.cellSize;
    coords.forEach((coord, idx) => {
      const x = coord.c * cs;
      const y = coord.r * cs;

      this.ctx.fillStyle = this.palette[color];
      this.ctx.fillRect(x, y, cs, cs);

      this.ctx.strokeStyle = this.palette[`${color}Dark`];
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x, y, cs, cs);

      // Subtle directional chevron arrow in each corridor cell
      this.drawChevron((coord.c + 0.5) * cs, (coord.r + 0.5) * cs, cs * 0.22, arrowDir);
    });
  }

  colorCell(c, r, color) {
    const cs = this.cellSize;
    this.ctx.fillStyle = this.palette[color];
    this.ctx.fillRect(c * cs, r * cs, cs, cs);
    this.ctx.strokeStyle = this.palette[`${color}Dark`];
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(c * cs, r * cs, cs, cs);
  }

  drawStartArrow(c, r, direction) {
    const cs = this.cellSize;
    const cx = (c + 0.5) * cs;
    const cy = (r + 0.5) * cs;
    const size = cs * 0.35;

    this.ctx.save();
    this.ctx.translate(cx, cy);
    if (direction === 'down') this.ctx.rotate(Math.PI / 2);
    if (direction === 'left') this.ctx.rotate(Math.PI);
    if (direction === 'up') this.ctx.rotate(-Math.PI / 2);

    this.ctx.beginPath();
    this.ctx.moveTo(size * 0.8, 0);
    this.ctx.lineTo(-size * 0.6, -size * 0.65);
    this.ctx.lineTo(-size * 0.3, 0);
    this.ctx.lineTo(-size * 0.6, size * 0.65);
    this.ctx.closePath();

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.shadowColor = 'rgba(0,0,0,0.4)';
    this.ctx.shadowBlur = 4;
    this.ctx.fill();
    this.ctx.restore();
  }

  drawChevron(cx, cy, size, direction) {
    this.ctx.save();
    this.ctx.translate(cx, cy);
    if (direction === 'down') this.ctx.rotate(Math.PI / 2);
    if (direction === 'left') this.ctx.rotate(Math.PI);
    if (direction === 'up') this.ctx.rotate(-Math.PI / 2);

    this.ctx.beginPath();
    this.ctx.moveTo(-size * 0.4, -size * 0.6);
    this.ctx.lineTo(size * 0.4, 0);
    this.ctx.lineTo(-size * 0.4, size * 0.6);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    this.ctx.lineWidth = 2.5;
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawSafeStar(cx, cy, radius) {
    this.ctx.save();
    this.ctx.beginPath();
    const spikes = 5;
    const innerRadius = radius * 0.42;
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    this.ctx.moveTo(cx, cy - radius);
    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * radius;
      let y = cy + Math.sin(rot) * radius;
      this.ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      this.ctx.lineTo(x, y);
      rot += step;
    }
    this.ctx.lineTo(cx, cy - radius);
    this.ctx.closePath();

    this.ctx.fillStyle = '#FFD700';
    this.ctx.shadowColor = 'rgba(0,0,0,0.35)';
    this.ctx.shadowBlur = 4;
    this.ctx.fill();

    this.ctx.strokeStyle = '#B78103';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawCenterHome() {
    const cs = this.cellSize;
    const startX = 6 * cs;
    const startY = 6 * cs;
    const centerSize = 3 * cs;
    const centerX = 7.5 * cs;
    const centerY = 7.5 * cs;

    // 4 Colored Home Triangles
    this.drawTriangle(startX, startY, startX, startY + centerSize, centerX, centerY, this.palette.red);
    this.drawTriangle(startX, startY, startX + centerSize, startY, centerX, centerY, this.palette.green);
    this.drawTriangle(startX + centerSize, startY, startX + centerSize, startY + centerSize, centerX, centerY, this.palette.yellow);
    this.drawTriangle(startX, startY + centerSize, startX + centerSize, startY + centerSize, centerX, centerY, this.palette.blue);

    // Center Golden Royal Crown Emblem
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, cs * 0.62, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.shadowColor = 'rgba(0,0,0,0.35)';
    this.ctx.shadowBlur = 8;
    this.ctx.fill();

    this.ctx.strokeStyle = this.palette.gold;
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    this.ctx.font = `${Math.round(cs * 0.65)}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('👑', centerX, centerY + 2);
    this.ctx.restore();
  }

  drawTriangle(x1, y1, x2, y2, x3, y3, color) {
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.lineTo(x3, y3);
    this.ctx.closePath();
    this.ctx.fillStyle = color;
    this.ctx.fill();
    this.ctx.strokeStyle = this.palette.gold;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  drawAllTokens() {
    if (!this.gameState || !this.gameState.players) return;
    const cs = this.cellSize;

    // Group static tokens by location
    const cellGroups = new Map();

    this.gameState.players.forEach(player => {
      player.tokens.forEach(token => {
        const key = `${player.color}-${token.id}`;
        if (this.animatingTokens.has(key)) return;

        const coord = this.getCoordinateForToken(player.color, token.id, token.step);
        const cellKey = `${coord.c.toFixed(1)},${coord.r.toFixed(1)}`;
        if (!cellGroups.has(cellKey)) {
          cellGroups.set(cellKey, []);
        }
        cellGroups.get(cellKey).push({ player, token, coord });
      });
    });

    // Render grouped static tokens
    cellGroups.forEach((group) => {
      const count = group.length;
      group.forEach((item, idx) => {
        let offsetX = 0;
        let offsetY = 0;
        let scale = 1.0;

        if (count > 1 && item.token.step !== -1 && item.token.step !== 56) {
          scale = 0.72;
          const dist = cs * 0.2;
          if (count === 2) {
            offsetX = idx === 0 ? -dist : dist;
            offsetY = 0;
          } else {
            offsetX = (idx % 2 === 0 ? -1 : 1) * dist;
            offsetY = (idx < 2 ? -1 : 1) * dist;
          }
        }

        const cx = (item.coord.c + 0.5) * cs + offsetX;
        const cy = (item.coord.r + 0.5) * cs + offsetY;

        const isMyTurn = (this.gameState.currentPlayerId === this.localPlayerId);
        const isMyToken = (item.player.id === this.localPlayerId);
        const isValid = isMyTurn && isMyToken && this.validTokenMoves.includes(item.token.id);
        const isHovered = (this.hoveredToken && this.hoveredToken.tokenId === item.token.id && this.hoveredToken.playerId === item.player.id);

        this.draw3DPawn(cx, cy, item.player.color, scale, isValid, isValid, isHovered);

        // Store bounding circle for click detection
        item.token.renderBounds = {
          cx, cy, radius: cs * 0.45 * scale,
          playerId: item.player.id,
          tokenId: item.token.id
        };
      });
    });

    // Render hopping animated tokens
    this.animatingTokens.forEach((anim) => {
      const fromX = (anim.fromCoord.c + 0.5) * cs;
      const fromY = (anim.fromCoord.r + 0.5) * cs;
      const toX = (anim.toCoord.c + 0.5) * cs;
      const toY = (anim.toCoord.r + 0.5) * cs;

      const curX = fromX + (toX - fromX) * anim.progress;
      const jumpArc = Math.sin(anim.progress * Math.PI) * (cs * anim.arcHeight);
      const curY = (fromY + (toY - fromY) * anim.progress) - jumpArc;

      // Drop shadow under hopping pawn
      this.ctx.save();
      this.ctx.beginPath();
      const shadowScale = 1 - (jumpArc / (cs * 1.5));
      this.ctx.ellipse(curX, fromY + (toY - fromY) * anim.progress + cs * 0.25, cs * 0.25 * shadowScale, cs * 0.12 * shadowScale, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.fill();
      this.ctx.restore();

      this.draw3DPawn(curX, curY, anim.playerColor, 1.2, false, false, false);
    });
  }

  // Draw authentic 3D Ludo King Pawn with Base, Neck, Head, and Bouncing Indicator Arrow
  draw3DPawn(cx, cy, color, scale = 1.0, isBouncing = false, isValid = false, isHovered = false) {
    const cs = this.cellSize;
    let bounceY = 0;
    if (isBouncing) {
      bounceY = Math.abs(Math.sin(performance.now() * 0.009)) * (cs * 0.22);
    }

    const y = cy - bounceY;
    const r = cs * 0.36 * scale;

    this.ctx.save();

    // 1. Pulsing Golden Halo when valid to move
    if (isValid) {
      const pulse = (Math.sin(performance.now() * 0.008) + 1) / 2;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy + r * 0.5, r * (1.4 + pulse * 0.4), 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 215, 0, ${0.45 + pulse * 0.35})`;
      this.ctx.fill();

      this.ctx.strokeStyle = '#FFD700';
      this.ctx.lineWidth = 3;
      this.ctx.stroke();

      // Bouncing Golden Arrow pointing down at the pawn
      this.drawBouncingArrow(cx, y - r * 1.5, cs * 0.28);
    }

    // 2. Base Drop Shadow
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy + r * 0.65, r * 0.85, r * 0.35, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.ctx.fill();

    // 3. Pawn Pedestal Base (Skirt)
    const baseGrad = this.ctx.createLinearGradient(cx - r, y, cx + r, y);
    baseGrad.addColorStop(0, this.palette[`${color}Dark`]);
    baseGrad.addColorStop(0.35, this.palette[color]);
    baseGrad.addColorStop(0.7, '#FFFFFF');
    baseGrad.addColorStop(1, this.palette[`${color}Dark`]);

    this.ctx.beginPath();
    this.ctx.ellipse(cx, y + r * 0.45, r * 0.78, r * 0.28, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = baseGrad;
    this.ctx.fill();
    this.ctx.strokeStyle = this.palette.gold;
    this.ctx.lineWidth = 1.2;
    this.ctx.stroke();

    // 4. Conical Body
    this.ctx.beginPath();
    this.ctx.moveTo(cx - r * 0.6, y + r * 0.45);
    this.ctx.quadraticCurveTo(cx - r * 0.2, y, cx - r * 0.3, y - r * 0.3);
    this.ctx.lineTo(cx + r * 0.3, y - r * 0.3);
    this.ctx.quadraticCurveTo(cx + r * 0.2, y, cx + r * 0.6, y + r * 0.45);
    this.ctx.closePath();

    const bodyGrad = this.ctx.createLinearGradient(cx - r, y, cx + r, y);
    bodyGrad.addColorStop(0, this.palette[`${color}Dark`]);
    bodyGrad.addColorStop(0.3, this.palette[color]);
    bodyGrad.addColorStop(0.65, '#FFFFFF');
    bodyGrad.addColorStop(1, this.palette[`${color}Dark`]);

    this.ctx.fillStyle = bodyGrad;
    this.ctx.fill();

    // 5. Collar Ring
    this.ctx.beginPath();
    this.ctx.ellipse(cx, y - r * 0.3, r * 0.38, r * 0.12, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = this.palette.gold;
    this.ctx.fill();

    // 6. Spherical Head
    const headRadius = r * 0.52;
    const headY = y - r * 0.82;

    const headGrad = this.ctx.createRadialGradient(
      cx - headRadius * 0.35, headY - headRadius * 0.35, headRadius * 0.1,
      cx, headY, headRadius
    );
    headGrad.addColorStop(0, '#FFFFFF');
    headGrad.addColorStop(0.4, this.palette[color]);
    headGrad.addColorStop(0.9, this.palette[`${color}Dark`]);
    headGrad.addColorStop(1, '#1A0000');

    this.ctx.beginPath();
    this.ctx.arc(cx, headY, headRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = headGrad;
    this.ctx.fill();

    this.ctx.strokeStyle = isHovered ? '#FFFFFF' : this.palette.gold;
    this.ctx.lineWidth = isHovered ? 2.5 : 1.5;
    this.ctx.stroke();

    // 7. Specular highlight glint
    this.ctx.beginPath();
    this.ctx.arc(cx - headRadius * 0.3, headY - headRadius * 0.3, headRadius * 0.2, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    this.ctx.fill();

    this.ctx.restore();
  }

  drawBouncingArrow(cx, cy, size) {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy + size * 0.8);
    this.ctx.lineTo(cx - size * 0.65, cy);
    this.ctx.lineTo(cx - size * 0.25, cy);
    this.ctx.lineTo(cx - size * 0.25, cy - size * 0.7);
    this.ctx.lineTo(cx + size * 0.25, cy - size * 0.7);
    this.ctx.lineTo(cx + size * 0.25, cy);
    this.ctx.lineTo(cx + size * 0.65, cy);
    this.ctx.closePath();

    this.ctx.fillStyle = '#FFD700';
    this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
    this.ctx.shadowBlur = 6;
    this.ctx.fill();

    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();
    this.ctx.restore();
  }

  handleHover(x, y) {
    if (!this.gameState || !this.gameState.players) return;
    let found = null;

    const isMyTurn = (this.gameState.currentPlayerId === this.localPlayerId);
    if (!isMyTurn) {
      this.hoveredToken = null;
      this.canvas.style.cursor = 'default';
      return;
    }

    const localPlayer = this.gameState.players.find(p => p.id === this.localPlayerId);
    if (!localPlayer) return;

    for (const token of localPlayer.tokens) {
      if (token.renderBounds && this.validTokenMoves.includes(token.id)) {
        const dx = x - token.renderBounds.cx;
        const dy = y - token.renderBounds.cy;
        if (Math.hypot(dx, dy) <= token.renderBounds.radius * 1.4) {
          found = { playerId: localPlayer.id, tokenId: token.id };
          break;
        }
      }
    }

    this.hoveredToken = found;
    this.canvas.style.cursor = found ? 'pointer' : 'default';
  }

  handleClick(x, y) {
    if (!this.gameState || !this.gameState.players) return;
    const isMyTurn = (this.gameState.currentPlayerId === this.localPlayerId);
    if (!isMyTurn) return;

    const localPlayer = this.gameState.players.find(p => p.id === this.localPlayerId);
    if (!localPlayer) return;

    // Generous touch hit detection: 0.8x cell size or at least 32px for fingers
    const hitRadius = Math.max(this.cellSize * 0.85, 32);
    let bestToken = null;
    let minDistance = Infinity;

    for (const token of localPlayer.tokens) {
      if (token.renderBounds && this.validTokenMoves.includes(token.id)) {
        const dx = x - token.renderBounds.cx;
        const dy = y - token.renderBounds.cy;
        const dist = Math.hypot(dx, dy);
        if (dist <= hitRadius && dist < minDistance) {
          minDistance = dist;
          bestToken = token;
        }
      }
    }

    if (bestToken && this.onTokenClick) {
      this.onTokenClick(bestToken.id);
    }
  }
}

window.LudoBoard = LudoBoard;
