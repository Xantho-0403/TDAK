import { SHAPES, SKINS } from './constants.js';

export class Renderer {
    constructor(mainCanvasId = 'tetrisCanvas', holdCanvasId = 'holdCanvas', nextCanvasId = 'nextCanvas') {
        this.mainCanvas = document.getElementById(mainCanvasId);
        this.mainCtx = this.mainCanvas ? this.mainCanvas.getContext('2d') : null;
        
        this.holdCanvas = holdCanvasId ? document.getElementById(holdCanvasId) : null;
        this.holdCtx = this.holdCanvas ? this.holdCanvas.getContext('2d') : null;
        
        this.nextCanvas = nextCanvasId ? document.getElementById(nextCanvasId) : null;
        this.nextCtx = this.nextCanvas ? this.nextCanvas.getContext('2d') : null;
        
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
        
        if (!mainCtx || !mainCanvas) return;
        
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

        // Draw VS Bot Match Result Overlay
        if (!engine.gameActive && engine.currentMode === 'VS_BOT' && engine.matchResult) {
            mainCtx.save();
            mainCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            mainCtx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
            
            mainCtx.textAlign = 'center';
            mainCtx.textBaseline = 'middle';
            mainCtx.shadowColor = 'rgba(0,0,0,0.9)';
            mainCtx.shadowBlur = 12;
            
            if (engine.matchResult === 'WIN') {
                mainCtx.fillStyle = '#00f0f0';
                mainCtx.font = 'bold 36px monospace';
                mainCtx.fillText('VICTORY', mainCanvas.width / 2, mainCanvas.height / 2);
                
                mainCtx.fillStyle = '#ffffff';
                mainCtx.font = '12px monospace';
                mainCtx.fillText('PRESS R TO REMATCH', mainCanvas.width / 2, mainCanvas.height / 2 + 50);
            } else if (engine.matchResult === 'LOSE') {
                mainCtx.fillStyle = '#ff33aa';
                mainCtx.font = 'bold 36px monospace';
                mainCtx.fillText('DEFEAT', mainCanvas.width / 2, mainCanvas.height / 2);
                
                mainCtx.fillStyle = '#ffffff';
                mainCtx.font = '12px monospace';
                mainCtx.fillText('PRESS R TO REMATCH', mainCanvas.width / 2, mainCanvas.height / 2 + 50);
            }
            mainCtx.restore();
        }

        // Render Hold Canvas
        const holdCtx = this.holdCtx;
        const holdCanvas = this.holdCanvas;
        if (holdCtx && holdCanvas) {
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
        }

        // Render Next Canvas
        const nextCtx = this.nextCtx;
        const nextCanvas = this.nextCanvas;
        if (nextCtx && nextCanvas) {
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

        // AI Debug Overlay rendering (Target placement preview and Heuristic details)
        if (engine.aiDebugData && engine.aiDebugData.show) {
            // 1. Draw target placement translucent highlight on the main board
            if (engine.aiDebugData.target) {
                const target = engine.aiDebugData.target;
                const matrix = target.matrix;
                
                if (matrix) {
                    mainCtx.save();
                    mainCtx.globalAlpha = 0.5;
                    mainCtx.strokeStyle = '#00ffff'; // Cyan highlight outline
                    mainCtx.lineWidth = 2;
                    
                    for (let r = 0; r < matrix.length; r++) {
                        for (let c = 0; c < matrix[r].length; c++) {
                            if (matrix[r][c] !== 0 && target.y + r >= 0) {
                                const blockX = (target.x + c) * 30;
                                const blockY = (target.y + r) * 30;
                                
                                // Soft neon cyan fill
                                mainCtx.fillStyle = 'rgba(0, 240, 240, 0.3)';
                                mainCtx.fillRect(blockX, blockY, 30, 30);
                                mainCtx.strokeRect(blockX + 1, blockY + 1, 28, 28);
                            }
                        }
                    }
                    mainCtx.restore();
                }
            }

            // 2. Draw Floating Telemetry Card
            mainCtx.save();
            mainCtx.fillStyle = 'rgba(10, 10, 12, 0.85)';
            mainCtx.strokeStyle = '#ff33aa';
            mainCtx.lineWidth = 1.5;
            
            const boxX = 10;
            const boxY = 10;
            const boxW = 280;
            const boxH = 82;
            
            mainCtx.fillRect(boxX, boxY, boxW, boxH);
            mainCtx.strokeRect(boxX, boxY, boxW, boxH);
            
            // Header
            mainCtx.fillStyle = '#ff33aa';
            mainCtx.font = 'bold 11px monospace';
            mainCtx.fillText('🤖 AI DEBUG PANEL', boxX + 12, boxY + 20);
            
            // Stats Text
            mainCtx.fillStyle = '#ffffff';
            mainCtx.font = '11px sans-serif';
            mainCtx.fillText(`Evaluated Placements: ${engine.aiDebugData.evaluatedCount}`, boxX + 12, boxY + 38);
            mainCtx.fillText(`Best Heuristic Score: ${engine.aiDebugData.score.toFixed(2)}`, boxX + 12, boxY + 54);
            
            if (engine.aiDebugData.target) {
                const rotNames = ['0°', 'CW (90°)', '180°', 'CCW (270°)'];
                const rotName = rotNames[engine.aiDebugData.target.rot] || '0°';
                mainCtx.fillText(`Target: Col ${engine.aiDebugData.target.x}, Row ${engine.aiDebugData.target.y}, Rot: ${rotName}`, boxX + 12, boxY + 70);
            } else {
                mainCtx.fillText('Target: Searching...', boxX + 12, boxY + 70);
            }
            mainCtx.restore();
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
