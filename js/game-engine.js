import { SHAPES, KICK_DATA_NORMAL, KICK_DATA_I } from './constants.js';

export class TetrisGame {
    constructor() {
        this.grid = Array.from({ length: 20 }, () => Array(10).fill(0));
        this.bag = [];
        this.nextQueue = [];
        this.holdPiece = null;
        this.hasHeld = false;
        this.currentPiece = null;
        
        this.combo = 0;
        this.b2bCount = 0;
        this.currentSpike = 0;
        this.spikeTimer = 0;

        this.currentMode = 'SURVIVAL'; 
        this.gameActive = true;
        this.elapsedTime = 0;         
        this.linesClearedTotal = 0;   
        this.piecesPlaced = 0;

        this.countdownActive = false;
        this.countdownValue = 3;
        this.countdownTimer = 0;

        this.botAttackQueue = 0;
        this.botAttackTimer = 0;
        this.cheeseLinesRemaining = 100;

        this.das = 130;
        this.arr = 10;
        this.sdf = 41; 
        this.lineClearDelay = 0; 

        this.gravityTimer = 0;
        this.baseGravityInterval = 1000; 
        this.lockDelayTimer = 0;
        this.lockDelayLimit = 500;   
        this.lockResetCount = 0;
        this.lockResetLimit = 15;    
        this.lineClearTimer = 0;

        this.lastAction = 'none';
        this.lastKickIndex = null;

        // Inputs & settings state decoupled from DOM/window
        this.isSoftDropping = false;
        this.targetBotApm = 70;

        this.accumulator = 0;
        this.history = [];

        // App-level notification interfaces
        this.onAction = null;
        this.onUIUpdate = null;
        this.onNewBest = null;

        this.init();
    }

    init() {
        this.refillBag();
        while (this.nextQueue.length < 6) this.pullToQueue();

        if (this.currentMode === '4W') {
            this.setup4wMap();
        } else if (this.currentMode === 'CHEESE') {
            this.cheeseLinesRemaining = 100;
            this.injectCheeseLines(10);
        }

        this.spawnPiece();

        this.countdownActive = true;
        this.countdownValue = 3;
        this.countdownTimer = 0;

        if (this.onUIUpdate) this.onUIUpdate();
    }

    setup4wMap() {
        for (let r = 0; r < 20; r++) {
            for (let c = 0; c < 10; c++) {
                this.grid[r][c] = (c < 3 || c > 6) ? 8 : 0;
            }
        }
        this.grid[19][4] = 3; this.grid[19][5] = 3; this.grid[19][6] = 3; 
    }

    injectCheeseLines(count) {
        let actualInject = Math.min(count, this.cheeseLinesRemaining);
        for (let i = 0; i < actualInject; i++) {
            this.grid.shift();
            let row = Array(10).fill(8);
            let hole = Math.floor(Math.random() * 10);
            row[hole] = 0;
            this.grid.push(row);
        }
    }

    saveState() {
        if (['4W', 'SURVIVAL', 'CHEESE'].includes(this.currentMode)) return null;
        return {
            gridStr: this.grid.map(row => row.join('')).join(','), 
            bagStr: this.bag.join(''),
            nextQueueStr: this.nextQueue.join(''),
            holdPiece: this.holdPiece || '',
            hasHeld: this.hasHeld ? 1 : 0,
            combo: this.combo,
            b2bCount: this.b2bCount,
            linesClearedTotal: this.linesClearedTotal,
            elapsedTime: this.elapsedTime,
            currentPieceStr: this.currentPiece ? `${this.currentPiece.type},${this.currentPiece.x},${this.currentPiece.y},${this.currentPiece.rotationState}` : '',
            currentSpike: this.currentSpike,
            spikeTimer: this.spikeTimer
        };
    }

    undo() {
        if (['4W', 'SURVIVAL', 'CHEESE'].includes(this.currentMode)) return;
        if (this.history.length < 2) return;
        this.history.pop(); 
        const prevState = this.history.pop(); 
        
        this.grid = prevState.gridStr.split(',').map(row => row.split('').map(Number));
        this.bag = prevState.bagStr.split('').filter(Boolean);
        this.nextQueue = prevState.nextQueueStr.split('').filter(Boolean);
        this.holdPiece = prevState.holdPiece || null;
        this.hasHeld = prevState.hasHeld === 1;
        this.combo = prevState.combo;
        this.b2bCount = prevState.b2bCount;
        this.linesClearedTotal = prevState.linesClearedTotal;
        this.elapsedTime = prevState.elapsedTime;
        this.currentSpike = prevState.currentSpike || 0;
        this.spikeTimer = prevState.spikeTimer || 0;

        if (prevState.currentPieceStr) {
            const [type, x, y, rot] = prevState.currentPieceStr.split(',');
            const rotationState = parseInt(rot);
            
            let matrix = JSON.parse(JSON.stringify(SHAPES[type]));
            for (let i = 0; i < rotationState; i++) {
                let size = matrix.length;
                let nextM = Array.from({ length: size }, () => Array(size).fill(0));
                for (let r = 0; r < size; r++) {
                    for (let c = 0; c < size; c++) {
                        nextM[c][size - 1 - r] = matrix[r][c];
                    }
                }
                matrix = nextM;
            }

            this.currentPiece = { type, x: parseInt(x), y: parseInt(y), rotationState, matrix };
        } else {
            this.currentPiece = null;
        }
        
        this.lockDelayTimer = 0;
        this.lockResetCount = 0;
        this.lastAction = 'none';
        this.lineClearTimer = 0; 
        
        this.history.push(prevState);
        if (this.onAction) this.onAction("UNDO");
        if (this.onUIUpdate) this.onUIUpdate();
    }

    reset() {
        this.grid = Array.from({ length: 20 }, () => Array(10).fill(0));
        this.bag = [];
        this.nextQueue = [];
        this.holdPiece = null;
        this.hasHeld = false;
        this.combo = 0;
        this.b2bCount = 0;
        this.currentSpike = 0;
        this.spikeTimer = 0;
        this.history = [];
        this.lineClearTimer = 0;
        this.botAttackQueue = 0;
        this.botAttackTimer = 0;
        this.cheeseLinesRemaining = 100;
        this.accumulator = 0; 
        
        this.elapsedTime = 0;
        this.linesClearedTotal = 0;
        this.piecesPlaced = 0;
        this.gameActive = true;

        this.init();
        if (this.onAction) this.onAction("RESET");
    }

    refillBag() {
        const pieces = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
        for (let i = pieces.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
        }
        this.bag = pieces;
    }

    pullToQueue() {
        if (this.bag.length === 0) this.refillBag();
        this.nextQueue.push(this.bag.shift());
    }

    spawnPiece() {
        if (!this.gameActive) return;

        const nextType = this.nextQueue.shift();
        this.pullToQueue();

        let startX = 3, startY = -1; 
        if (nextType === 'O') { startX = 4; startY = -1; }

        this.currentPiece = {
            type: nextType,
            matrix: JSON.parse(JSON.stringify(SHAPES[nextType])),
            x: startX,
            y: startY,
            rotationState: 0
        };

        this.hasHeld = false;
        this.lockDelayTimer = 0;
        this.lockResetCount = 0;
        this.lastAction = 'none';
        this.lastKickIndex = null;

        if (this.onUIUpdate) this.onUIUpdate();

        if (!['4W', 'SURVIVAL', 'CHEESE'].includes(this.currentMode)) {
            this.history.push(this.saveState());
            if (this.history.length > 50) this.history.shift(); 
        }

        if (!this.isValidMove(this.currentPiece.matrix, this.currentPiece.x, this.currentPiece.y)) {
            this.gameActive = false;
            if (this.onAction) this.onAction("TOP OUT!");
            if (this.onUIUpdate) this.onUIUpdate();
        }
    }

    isValidMove(matrix, nextX, nextY) {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c] !== 0) {
                    let boardX = nextX + c;
                    let boardY = nextY + r;
                    if (boardX < 0 || boardX >= 10 || boardY >= 20) return false;
                    
                    if (this.currentMode === '4W' && boardY < 0) {
                        if (boardX < 3 || boardX > 6) return false;
                    }

                    if (boardY >= 0 && this.grid[boardY][boardX] !== 0) return false;
                }
            }
        }
        return true;
    }

    isGrounded() {
        if (!this.currentPiece) return false;
        return !this.isValidMove(this.currentPiece.matrix, this.currentPiece.x, this.currentPiece.y + 1);
    }

    handleLockReset() {
        if (this.isGrounded() && this.lockResetCount < this.lockResetLimit) {
            this.lockDelayTimer = 0;
            this.lockResetCount++;
        }
    }

    tryMove(dx, dy) {
        if (!this.gameActive) return false;
        if (this.isValidMove(this.currentPiece.matrix, this.currentPiece.x + dx, this.currentPiece.y + dy)) {
            this.currentPiece.x += dx;
            this.currentPiece.y += dy;
            this.lastAction = 'move';
            this.handleLockReset();
            return true;
        }
        return false;
    }

    rotate(direction) {
        if (!this.currentPiece || this.currentPiece.type === 'O' || !this.gameActive) return;

        const currentMatrix = this.currentPiece.matrix;
        const size = currentMatrix.length;
        let newMatrix = Array.from({ length: size }, () => Array(size).fill(0));

        if (direction === 'CW') {
            for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) newMatrix[c][size - 1 - r] = currentMatrix[r][c];
        } else if (direction === 'CCW') {
            for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) newMatrix[size - 1 - c][r] = currentMatrix[r][c];
        } else if (direction === '180') {
            for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) newMatrix[size - 1 - r][size - 1 - c] = currentMatrix[r][c];
        }

        const startState = this.currentPiece.rotationState;
        let endState = startState;
        if (direction === 'CW') endState = (startState + 1) % 4;
        else if (direction === 'CCW') endState = (startState + 3) % 4;
        else if (direction === '180') endState = (startState + 2) % 4;

        const lookupKey = `${startState}->${endState}`;
        const kickTable = (this.currentPiece.type === 'I') ? KICK_DATA_I[lookupKey] : KICK_DATA_NORMAL[lookupKey];

        if (kickTable) {
            for (let i = 0; i < kickTable.length; i++) {
                let dx = kickTable[i][0];
                let dy = -kickTable[i][1];

                if (this.isValidMove(newMatrix, this.currentPiece.x + dx, this.currentPiece.y + dy)) {
                    this.currentPiece.matrix = newMatrix;
                    this.currentPiece.x += dx;
                    this.currentPiece.y += dy;
                    this.currentPiece.rotationState = endState;
                    this.lastAction = 'rotate';
                    this.lastKickIndex = i;
                    this.handleLockReset();
                    return;
                }
            }
        }
    }

    checkTSpin() {
        if (this.currentPiece.type !== 'T' || this.lastAction !== 'rotate') {
            return { isSpin: false, isMini: false };
        }

        const px = this.currentPiece.x;
        const py = this.currentPiece.y;

        const isCornerFilled = (dr, dc) => {
            const bx = px + dc;
            const by = py + dr;
            if (bx < 0 || bx >= 10 || by >= 20) return true;
            if (by < 0) return false;
            return this.grid[by][bx] !== 0;
        };

        const corners = { tl: isCornerFilled(0, 0), tr: isCornerFilled(0, 2), bl: isCornerFilled(2, 0), br: isCornerFilled(2, 2) };
        const filledCount = Object.values(corners).filter(Boolean).length;

        if (filledCount < 3) return { isSpin: false, isMini: false };

        const frontCornersByState = {
            0: ['tl', 'tr'], 
            1: ['tr', 'br'], 
            2: ['bl', 'br'], 
            3: ['tl', 'bl']  
        };
        const front = frontCornersByState[this.currentPiece.rotationState];
        const frontFilledCount = front.filter(key => corners[key]).length;

        const isRegular = (frontFilledCount === 2) || (this.lastKickIndex === 4);

        return { isSpin: true, isMini: !isRegular };
    }

    hardDrop() {
        if (!this.currentPiece || this.lineClearTimer > 0 || !this.gameActive) return;
        while (this.tryMove(0, 1)) {}
        this.lockPiece();
    }

    lockPiece() {
        let pieceType = this.currentPiece.type;
        this.piecesPlaced++;
        const tSpinResult = this.checkTSpin();
        let isSpin = tSpinResult.isSpin;
        let isMini = tSpinResult.isMini;

        const matrix = this.currentPiece.matrix;
        const pieceIndex = Object.keys(SHAPES).indexOf(pieceType) + 1;

        let lockedInBounds = false;

        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c] !== 0) {
                    let boardY = this.currentPiece.y + r;
                    let boardX = this.currentPiece.x + c;
                    if (boardY >= 0) {
                        this.grid[boardY][boardX] = pieceIndex;
                        lockedInBounds = true;
                    }
                }
            }
        }

        if (!lockedInBounds) {
            this.gameActive = false;
            if (this.onAction) this.onAction("LOCK OUT!");
            if (this.onUIUpdate) this.onUIUpdate();
            return;
        }

        let targetLines = [];
        for (let r = 0; r < 20; r++) {
            if (this.grid[r].every(val => val !== 0)) targetLines.push(r);
        }

        const cleared = targetLines.length;

        const isTSpin = isSpin && pieceType === 'T';
        let spinLabel = '';

        let attackPower = 0;
        if (isTSpin) {
            spinLabel = isMini ? 'T-SPIN MINI ' : 'T-SPIN ';
            if (isMini) {
                if (cleared === 1) attackPower = 1;
                else if (cleared === 2) attackPower = 2;
            } else {
                if (cleared === 1) attackPower = 2;
                else if (cleared === 2) attackPower = 4;
                else if (cleared === 3) attackPower = 6;
            }
        } else {
            if (cleared === 2) attackPower = 1;
            else if (cleared === 3) attackPower = 2;
            else if (cleared === 4) attackPower = 4;
        }

        if (cleared > 0) {
            const isDifficultClear = (cleared === 4) || isTSpin;
            if (isDifficultClear) {
                this.b2bCount++;
                if (this.b2bCount > 1) attackPower += 1;
            } else {
                this.b2bCount = 0;
            }
        }

        if (cleared > 0 && this.combo > 0) { 
            if (this.combo <= 2) attackPower += 1;
            else if (this.combo <= 4) attackPower += 2;
            else attackPower += 3;
        }

        if (attackPower > 0) {
            this.currentSpike += attackPower;
            this.spikeTimer = 2000; 
        }

        if (cleared > 0) {
            this.linesClearedTotal += cleared; 
            this.combo++;

            if (this.currentMode === 'CHEESE') {
                targetLines.forEach(r => {
                    if (this.grid[r].includes(8)) {
                        if (this.cheeseLinesRemaining > 0) this.cheeseLinesRemaining--;
                    }
                });
            }

            if (this.currentMode === 'SURVIVAL') {
                if (this.botAttackQueue > 0) {
                    this.botAttackQueue = Math.max(0, this.botAttackQueue - attackPower);
                }
            }

            if (this.onAction) this.onAction(`${spinLabel}${this.combo - 1} COMBO!`);
        } else {
            if (this.currentMode === '4W') {
                this.gameActive = false;
                let finalCombo = this.combo > 0 ? this.combo - 1 : 0;
                if (this.onNewBest) this.onNewBest('4W', 'combo', finalCombo);
                if (this.onUIUpdate) this.onUIUpdate();
                return;
            }

            if (this.currentMode === 'CHEESE') {
                this.combo = 0;
                let currentCheeseLines = this.grid.filter(row => row.includes(8)).length;
                let needed = 10 - currentCheeseLines;
                if (needed > 0) this.injectCheeseLines(needed);
            }

            if (this.currentMode === 'SURVIVAL') {
                this.combo = 0;
                if (this.botAttackQueue > 0) {
                    let spawnAmt = Math.min(this.botAttackQueue, 8);
                    this.botAttackQueue -= spawnAmt;
                    let holeIdx = Math.floor(Math.random() * 10); 
                    
                    for (let i = 0; i < spawnAmt; i++) {
                        this.grid.shift();
                        let row = Array(10).fill(8);
                        row[holeIdx] = 0;
                        this.grid.push(row);
                    }
                }
            }
            
            this.combo = 0;
        }

        if (this.currentMode === '40L' && this.linesClearedTotal >= 40) {
            this.linesClearedTotal = 40; this.gameActive = false; this.currentPiece = null;
            this.executeLineClear(targetLines); 
            if (this.onUIUpdate) this.onUIUpdate();
            if (this.onNewBest) this.onNewBest('40L', 'time', this.elapsedTime);
            return;
        }

        if (this.currentMode === 'CHEESE' && this.cheeseLinesRemaining <= 0) {
            this.gameActive = false; this.currentPiece = null;
            this.executeLineClear(targetLines); 
            if (this.onUIUpdate) this.onUIUpdate();
            if (this.onNewBest) this.onNewBest('CHEESE', 'time', this.elapsedTime);
            return;
        }

        if (cleared > 0 && this.lineClearDelay > 0) {
            this.lineClearTimer = this.lineClearDelay;
            this.currentPiece = null; 
        } else {
            this.executeLineClear(targetLines);
            this.spawnPiece();
        }
    }

    executeLineClear(lines) {
        if (!lines || lines.length === 0) return;
        lines.sort((a, b) => a - b);
        for (let r of lines) {
            this.grid.splice(r, 1);
            if (this.currentMode === '4W') {
                let newRow = Array(10).fill(0);
                newRow[0] = 8; newRow[1] = 8; newRow[2] = 8;
                newRow[7] = 8; newRow[8] = 8; newRow[9] = 8;
                this.grid.unshift(newRow);
            } else {
                this.grid.unshift(Array(10).fill(0));
            }
        }
    }

    hold() {
        if (this.hasHeld || !this.currentPiece || this.lineClearTimer > 0 || !this.gameActive) return;

        const currentType = this.currentPiece.type;
        if (!this.holdPiece) {
            this.holdPiece = currentType;
            this.spawnPiece();
        } else {
            const temp = this.holdPiece;
            this.holdPiece = currentType;
            
            let sX = 3, sY = -1;
            if(temp === 'O') { sX = 4; sY = -1; }

            this.currentPiece = {
                type: temp,
                matrix: JSON.parse(JSON.stringify(SHAPES[temp])),
                x: sX,
                y: sY,
                rotationState: 0
            };
        }
        this.hasHeld = true;
        this.lockDelayTimer = 0;
        this.lockResetCount = 0;
    }

    update(dt) {
        if (!this.gameActive) return;

        if (this.countdownActive) {
            this.countdownTimer += dt;
            this.countdownValue = 3 - Math.floor(this.countdownTimer / 1000);
            if (this.countdownTimer >= 3000) {
                this.countdownActive = false;
            }
            if (this.onUIUpdate) this.onUIUpdate();
            return;
        }

        this.elapsedTime += dt;

        if (this.spikeTimer > 0) {
            this.spikeTimer -= dt;
            if (this.spikeTimer <= 0) {
                this.spikeTimer = 0;
                this.currentSpike = 0;
            }
        }

        if (this.onUIUpdate) this.onUIUpdate();

        if (this.currentMode === 'SURVIVAL') {
            const packetSize = 4; 
            const msPerLine = 60000 / this.targetBotApm;
            const packetInterval = msPerLine * packetSize;

            this.botAttackTimer += dt;
            if (this.botAttackTimer >= packetInterval) {
                this.botAttackQueue = Math.min(20, this.botAttackQueue + packetSize);
                this.botAttackTimer -= packetInterval;
            }
        }

        if (this.lineClearTimer > 0) {
            this.lineClearTimer -= dt;
            if (this.lineClearTimer <= 0) {
                this.lineClearTimer = 0;
                let targetLines = [];
                for (let r = 0; r < 20; r++) {
                    if (this.grid[r].every(val => val !== 0)) targetLines.push(r);
                }
                this.executeLineClear(targetLines);
                this.spawnPiece();
            }
            return; 
        }

        if (!this.currentPiece) return;

        if (this.isGrounded()) {
            this.lockDelayTimer += dt;
            if (this.lockDelayTimer >= this.lockDelayLimit) {
                this.lockPiece();
            }
        } else {
            if (!(this.isSoftDropping && this.sdf >= 41)) {
                let effectiveGravity = this.baseGravityInterval;
                if (this.isSoftDropping) effectiveGravity = this.baseGravityInterval / this.sdf;

                this.gravityTimer += dt;
                if (this.gravityTimer >= effectiveGravity) {
                    this.tryMove(0, 1);
                    this.gravityTimer = 0;
                }
            }
        }
    }
}
