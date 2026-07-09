import { SHAPES, SKINS } from './constants.js';

export class Renderer {
    constructor() {
        this.mainCanvas = document.getElementById('tetrisCanvas');
        this.mainCtx = this.mainCanvas.getContext('2d');
        
        this.holdCanvas = document.getElementById('holdCanvas');
        this.holdCtx = this.holdCanvas.getContext('2d');
        
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        this.currentSkin = localStorage.getItem('tetris_skin') || 'classic';
    }

    getPalette() {
        return SKINS[this.currentSkin] || SKINS.classic;
    }

    drawBlock(ctx, x, y, colorIndex, size = 30, forceGray = false) {
        const palette = this.getPalette();
        let color = palette[colorIndex];
        if (forceGray && colorIndex !== 0) {
            const grayscaleMap = {
                1: '#9c9c9c', 2: '#b3b3b3', 3: '#808080',
                4: '#666666', 5: '#555555', 6: '#444444', 7: '#8a8a8a', 8: '#333333'
            };
            color = grayscaleMap[colorIndex] || '#555555';
        }

        if (this.currentSkin === 'neon' && colorIndex !== 0 && !forceGray) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;
        }
        ctx.fillStyle = color;
        ctx.fillRect(x * size, y * size, size, size);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = forceGray ? '#292929' : '#222';
        ctx.strokeRect(x * size, y * size, size, size);
    }

    renderGame(engine) {
        const mainCtx = this.mainCtx;
        const mainCanvas = this.mainCanvas;
        
        mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);

        // Grid Background Score Display in 40L Mode
        if (engine.currentMode === '40L' && engine.gameActive) {
            const linesLeft = Math.max(0, 40 - engine.linesClearedTotal);
            mainCtx.save();
            mainCtx.fillStyle = 'rgba(255, 255, 255, 0.07)';
            mainCtx.font = 'bold 200px "Segoe UI", sans-serif';
            mainCtx.textAlign = 'center';
            mainCtx.textBaseline = 'middle';
            mainCtx.fillText(linesLeft, mainCanvas.width / 2, mainCanvas.height / 2);
            mainCtx.restore();
        }
        
        // Draw Stack Grid
        for (let r = 0; r < 20; r++) {
            for (let c = 0; c < 10; c++) {
                if (engine.grid[r][c] !== 0) {
                    this.drawBlock(mainCtx, c, r, engine.grid[r][c], 30, !engine.gameActive);
                } else {
                    mainCtx.strokeStyle = '#222';
                    mainCtx.strokeRect(c * 30, r * 30, 30, 30);
                }
            }
        }

        // Draw Ghost and Active Piece
        if (engine.currentPiece) {
            let ghostY = engine.currentPiece.y;
            while (engine.isValidMove(engine.currentPiece.matrix, engine.currentPiece.x, ghostY + 1)) ghostY++;
            
            const matrix = engine.currentPiece.matrix;
            const pieceIndex = Object.keys(SHAPES).indexOf(engine.currentPiece.type) + 1;
            
            // Ghost Piece
            mainCtx.globalAlpha = 0.25;
            for (let r = 0; r < matrix.length; r++) {
                for (let c = 0; c < matrix[r].length; c++) {
                    if (matrix[r][c] !== 0 && ghostY + r >= 0) {
                        this.drawBlock(mainCtx, engine.currentPiece.x + c, ghostY + r, pieceIndex, 30, !engine.gameActive);
                    }
                }
            }
            mainCtx.globalAlpha = 1.0;

            // Active Piece
            for (let r = 0; r < matrix.length; r++) {
                for (let c = 0; c < matrix[r].length; c++) {
                    if (matrix[r][c] !== 0 && engine.currentPiece.y + r >= 0) {
                        this.drawBlock(mainCtx, engine.currentPiece.x + c, engine.currentPiece.y + r, pieceIndex, 30, !engine.gameActive);
                    }
                }
            }
        }

        // Draw Countdown Overlay
        if (engine.countdownActive) {
            mainCtx.save();
            mainCtx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            mainCtx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
            mainCtx.fillStyle = '#ffcc00';
            mainCtx.font = 'bold 140px "Segoe UI", sans-serif';
            mainCtx.textAlign = 'center';
            mainCtx.textBaseline = 'middle';
            mainCtx.shadowColor = 'rgba(0,0,0,0.8)';
            mainCtx.shadowBlur = 15;
            const displayValue = engine.countdownValue > 0 ? engine.countdownValue : '';
            mainCtx.fillText(displayValue, mainCanvas.width / 2, mainCanvas.height / 2);
            mainCtx.restore();
        }

        // Render Hold Canvas
        const holdCtx = this.holdCtx;
        const holdCanvas = this.holdCanvas;
        holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
        if (engine.holdPiece) {
            const matrix = SHAPES[engine.holdPiece];
            const pieceIndex = Object.keys(SHAPES).indexOf(engine.holdPiece) + 1;
            for (let r = 0; r < matrix.length; r++) {
                for (let c = 0; c < matrix[r].length; c++) {
                    if (matrix[r][c] !== 0) {
                        this.drawBlock(holdCtx, c + 1, r + 1, pieceIndex, 20, !engine.gameActive);
                    }
                }
            }
        }

        // Render Next Canvas
        const nextCtx = this.nextCtx;
        const nextCanvas = this.nextCanvas;
        nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        for (let i = 0; i < 5; i++) {
            const nextType = engine.nextQueue[i];
            if (nextType) {
                const matrix = SHAPES[nextType];
                const pieceIndex = Object.keys(SHAPES).indexOf(nextType) + 1;
                for (let r = 0; r < matrix.length; r++) {
                    for (let c = 0; c < matrix[r].length; c++) {
                        if (matrix[r][c] !== 0) {
                            this.drawBlock(nextCtx, c + 1, r + 1 + (i * 3.5), pieceIndex, 20, !engine.gameActive);
                        }
                    }
                }
            }
        }
    }

    renderHistoryGraph(history) {
        const canvas = document.getElementById('historyGraphCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!history || history.length === 0) {
            ctx.fillStyle = '#555';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('기록 없음 (40L을 완료해보세요)', canvas.width / 2, canvas.height / 2 + 3);
            return;
        }

        const minT = Math.min(...history);
        const maxT = Math.max(...history);
        const range = Math.max(1, maxT - minT);
        const barW = canvas.width / history.length;

        history.forEach((t, i) => {
            const normalized = (maxT - t) / range; 
            const h = 6 + normalized * (canvas.height - 10);
            const x = i * barW;
            const y = canvas.height - h;
            const isBest = (t === minT);
            const isLast = (i === history.length - 1);
            ctx.fillStyle = isBest ? '#ffcc00' : (isLast ? '#00f0f0' : '#3a5a5a');
            ctx.fillRect(x + 1, y, Math.max(1, barW - 2), h);
        });
    }
}
