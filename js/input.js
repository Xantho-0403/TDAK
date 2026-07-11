import { SHAPES, KICK_DATA_NORMAL, KICK_DATA_I, safeStorage } from './constants.js';

export class InputProvider {
    constructor() {
        this.game = null;
    }

    attach(game) {
        this.game = game;
    }

    detach() {
        this.game = null;
    }

    update(dt) {
        // Abstract method to be overridden
    }
}

export class KeyboardInputProvider extends InputProvider {
    constructor() {
        super();
        this.inputs = { left: false, right: false, down: false };
        this.activeDirection = 'none';
        this.dasTimer = 0;
        this.arrTimer = 0;
        
        // Default physical key bindings
        this.keyBindings = {
            'ArrowLeft': 'left', 'ArrowRight': 'right', 'ArrowDown': 'down',
            'Space': 'hardDrop', 'KeyX': 'cw', 'KeyZ': 'ccw', 'KeyC': 'rotate180',
            'ShiftLeft': 'hold', 'KeyR': 'reset'
        };
        
        this.loadKeyBindings();
        
        this.keyFlash = { cw: 0, ccw: 0, rotate180: 0, hardDrop: 0, hold: 0 };
        this.das = 130;
        this.arr = 10;
        this.sdf = 41;
        this.rebindTarget = null;
        this.isModalOpen = false;
    }

    getKeyByAction(actionName) {
        return Object.keys(this.keyBindings).find(key => this.keyBindings[key] === actionName);
    }

    startRebind(actionName) {
        this.rebindTarget = actionName;
        document.querySelectorAll('.key-bind-btn').forEach(btn => btn.classList.remove('active'));
        
        const targetBtn = document.getElementById(`btn-${actionName}`);
        if (targetBtn) {
            targetBtn.classList.add('active');
            targetBtn.innerText = "Press key...";
        }

        const modalTargetBtn = document.getElementById(`modal-btn-${actionName}`);
        if (modalTargetBtn) {
            modalTargetBtn.classList.add('active');
            modalTargetBtn.innerText = "Press key...";
        }
    }

    executeRebind(code) {
        if (this.keyBindings[code]) delete this.keyBindings[code];
        const oldKey = this.getKeyByAction(this.rebindTarget);
        if (oldKey) delete this.keyBindings[oldKey];

        this.keyBindings[code] = this.rebindTarget;
        this.saveKeyBindings();

        const targetBtn = document.getElementById(`btn-${this.rebindTarget}`);
        if (targetBtn) {
            targetBtn.innerText = code;
            targetBtn.classList.remove('active');
        }

        const modalTargetBtn = document.getElementById(`modal-btn-${this.rebindTarget}`);
        if (modalTargetBtn) {
            modalTargetBtn.innerText = code;
            modalTargetBtn.classList.remove('active');
        }

        this.rebindTarget = null;
    }

    saveKeyBindings() {
        safeStorage.setItem('tetris_key_bindings', JSON.stringify(this.keyBindings));
    }

    loadKeyBindings() {
        try {
            const stored = safeStorage.getItem('tetris_key_bindings');
            if (stored) {
                this.keyBindings = JSON.parse(stored);
                // Ensure reset key is present
                if (!Object.values(this.keyBindings).includes('reset')) {
                    this.keyBindings['KeyR'] = 'reset';
                }
            }
        } catch (e) {
            console.error('Failed to load key bindings', e);
        }
    }

    handleKeyDown(code) {
        if (this.rebindTarget) { this.executeRebind(code); return; }
        if (this.isModalOpen) return; 
        if (!this.game || this.game.countdownActive) return; 

        const action = this.keyBindings[code];
        if (!action) return;

        if (action === 'left') {
            this.inputs.left = true; this.activeDirection = 'left';
            this.dasTimer = 0; this.arrTimer = 0; this.game.moveLeft();
        } else if (action === 'right') {
            this.inputs.right = true; this.activeDirection = 'right';
            this.dasTimer = 0; this.arrTimer = 0; this.game.moveRight();
        } else if (action === 'down') {
            this.inputs.down = true;
            this.game.setSoftDrop(true);
        } else if (action === 'hardDrop') {
            this.game.hardDrop();
            this.keyFlash.hardDrop = 150;
        } else if (action === 'cw') {
            this.game.rotateCW();
            this.keyFlash.cw = 150;
        } else if (action === 'ccw') {
            this.game.rotateCCW();
            this.keyFlash.ccw = 150;
        } else if (action === 'rotate180') {
            this.game.rotate180();
            this.keyFlash.rotate180 = 150;
        } else if (action === 'hold') {
            this.game.hold();
            this.keyFlash.hold = 150;
        }
    }

    handleKeyUp(code) {
        if (this.rebindTarget || this.isModalOpen) return;
        
        if (code === this.getKeyByAction('left')) this.inputs.left = false;
        if (code === this.getKeyByAction('right')) this.inputs.right = false;
        if (code === this.getKeyByAction('down')) {
            this.inputs.down = false;
            if (this.game) this.game.setSoftDrop(false);
        }

        if (this.inputs.left && !this.inputs.right) {
            if (this.activeDirection !== 'left') { this.activeDirection = 'left'; this.dasTimer = 0; this.arrTimer = 0; }
        } else if (this.inputs.right && !this.inputs.left) {
            if (this.activeDirection !== 'right') { this.activeDirection = 'right'; this.dasTimer = 0; this.arrTimer = 0; }
        } else {
            this.activeDirection = 'none';
        }
    }

    update(dt) {
        if (!this.game || !this.game.gameActive || this.game.countdownActive || this.isModalOpen) return;

        if (this.inputs.down && this.game.sdf >= 41) {
            while (this.game.tryMove(0, 1)) {}
        }

        if (this.activeDirection !== 'none') {
            this.dasTimer += dt;
            if (this.dasTimer >= this.das) {
                if (this.arr === 0) {
                    let step = (this.activeDirection === 'left') ? -1 : 1;
                    while (this.game.tryMove(step, 0)) {}
                } else {
                    this.arrTimer += dt;
                    let step = (this.activeDirection === 'left') ? -1 : 1;
                    while (this.arrTimer >= this.arr) {
                        this.game.tryMove(step, 0);
                        this.arrTimer -= this.arr;
                    }
                }
            }
        }
    }
}

// Helper Simulation Functions for DebugAI
function rotatePieceSim(piece, direction, grid, currentMode) {
    if (piece.type === 'O') return true;

    const currentMatrix = piece.matrix;
    const size = currentMatrix.length;
    let newMatrix = Array.from({ length: size }, () => Array(size).fill(0));

    if (direction === 'CW') {
        for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) newMatrix[c][size - 1 - r] = currentMatrix[r][c];
    } else if (direction === 'CCW') {
        for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) newMatrix[size - 1 - c][r] = currentMatrix[r][c];
    } else if (direction === '180') {
        for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) newMatrix[size - 1 - r][size - 1 - c] = currentMatrix[r][c];
    }

    const startState = piece.rotationState;
    let endState = startState;
    if (direction === 'CW') endState = (startState + 1) % 4;
    else if (direction === 'CCW') endState = (startState + 3) % 4;
    else if (direction === '180') endState = (startState + 2) % 4;

    const lookupKey = `${startState}->${endState}`;
    const kickTable = (piece.type === 'I') ? KICK_DATA_I[lookupKey] : KICK_DATA_NORMAL[lookupKey];

    const isValidMoveSim = (matrix, nextX, nextY) => {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c] !== 0) {
                    let boardX = nextX + c;
                    let boardY = nextY + r;
                    if (boardX < 0 || boardX >= 10 || boardY >= 20) return false;
                    if (currentMode === '4W' && boardY < 0) {
                        if (boardX < 3 || boardX > 6) return false;
                    }
                    if (boardY >= 0 && grid[boardY][boardX] !== 0) return false;
                }
            }
        }
        return true;
    };

    if (kickTable) {
        for (let i = 0; i < kickTable.length; i++) {
            let dx = kickTable[i][0];
            let dy = -kickTable[i][1];

            if (isValidMoveSim(newMatrix, piece.x + dx, piece.y + dy)) {
                piece.matrix = newMatrix;
                piece.x += dx;
                piece.y += dy;
                piece.rotationState = endState;
                return true;
            }
        }
    }
    return false;
}

function movePieceSim(piece, dx, dy, grid, currentMode) {
    const isValidMoveSim = (matrix, nextX, nextY) => {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c] !== 0) {
                    let boardX = nextX + c;
                    let boardY = nextY + r;
                    if (boardX < 0 || boardX >= 10 || boardY >= 20) return false;
                    if (currentMode === '4W' && boardY < 0) {
                        if (boardX < 3 || boardX > 6) return false;
                    }
                    if (boardY >= 0 && grid[boardY][boardX] !== 0) return false;
                }
            }
        }
        return true;
    };

    if (isValidMoveSim(piece.matrix, piece.x + dx, piece.y + dy)) {
        piece.x += dx;
        piece.y += dy;
        return true;
    }
    return false;
}

function dropPieceSim(piece, grid, currentMode) {
    while (movePieceSim(piece, 0, 1, grid, currentMode)) {}
}

function getPlacementSim(game, rot, targetX) {
    const grid = game.grid.map(row => [...row]);
    const currentMode = game.currentMode;

    let piece = {
        type: game.currentPiece.type,
        matrix: JSON.parse(JSON.stringify(game.currentPiece.matrix)),
        x: game.currentPiece.x,
        y: game.currentPiece.y,
        rotationState: game.currentPiece.rotationState
    };

    const actions = [];

    // 1. Apply rotations
    if (rot === 1) {
        if (!rotatePieceSim(piece, 'CW', grid, currentMode)) return null;
        actions.push('cw');
    } else if (rot === 2) {
        if (!rotatePieceSim(piece, '180', grid, currentMode)) return null;
        actions.push('rotate180');
    } else if (rot === 3) {
        if (!rotatePieceSim(piece, 'CCW', grid, currentMode)) return null;
        actions.push('ccw');
    }

    // 2. Apply horizontal movement
    const dx = targetX - piece.x;
    const step = dx > 0 ? 1 : -1;
    const absDx = Math.abs(dx);
    const moveAction = dx > 0 ? 'right' : 'left';

    for (let i = 0; i < absDx; i++) {
        if (!movePieceSim(piece, step, 0, grid, currentMode)) return null;
        actions.push(moveAction);
    }

    // 3. Drop to find landing Y
    dropPieceSim(piece, grid, currentMode);

    // Verify final landing spot is valid
    const isValidMoveSim = (matrix, nextX, nextY) => {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c] !== 0) {
                    let boardX = nextX + c;
                    let boardY = nextY + r;
                    if (boardX < 0 || boardX >= 10 || boardY >= 20) return false;
                    if (boardY >= 0 && grid[boardY][boardX] !== 0) return false;
                }
            }
        }
        return true;
    };

    if (!isValidMoveSim(piece.matrix, piece.x, piece.y)) {
        return null;
    }

    actions.push('hardDrop');

    return {
        x: piece.x,
        y: piece.y,
        rot: rot,
        actions: actions
    };
}

export class BotInputProvider extends InputProvider {
    constructor() {
        super();
    }

    executeAction(action) {
        if (!this.game || !this.game.gameActive || this.game.countdownActive) return;

        switch (action) {
            case 'left':
                this.game.moveLeft();
                break;
            case 'right':
                this.game.moveRight();
                break;
            case 'cw':
                this.game.rotateCW();
                break;
            case 'ccw':
                this.game.rotateCCW();
                break;
            case 'rotate180':
                this.game.rotate180();
                break;
            case 'down':
                this.game.tryMove(0, 1);
                break;
            case 'hardDrop':
                this.game.hardDrop();
                break;
            case 'hold':
                this.game.hold();
                break;
        }

        if (this.game.onUIUpdate) {
            this.game.onUIUpdate();
        }
    }
}

export class PPSScheduler {
    constructor(inputProvider) {
        this.inputProvider = inputProvider;
        this.pendingActions = []; // Array of { action: string, time: number }
        this.pps = 3.0;
        this.elapsedTime = 0;
        this.nextAvailableStartTime = 0;
    }

    setPPS(pps) {
        this.pps = Math.max(0.5, Math.min(15.0, pps));
    }

    queueAction(action) {
        this.pendingActions.push({
            action: action,
            time: this.elapsedTime
        });
    }

    queueActions(actions) {
        if (actions.length === 0) return;

        if (this.nextAvailableStartTime < this.elapsedTime) {
            this.nextAvailableStartTime = this.elapsedTime;
        }

        const duration = 1000 / this.pps; // Duration for one complete piece placement in ms

        // If the only action is 'hold', execute it immediately without consuming piece duration budget
        if (actions.length === 1 && actions[0] === 'hold') {
            this.pendingActions.push({
                action: 'hold',
                time: this.nextAvailableStartTime
            });
            return;
        }

        const N = actions.length;

        for (let i = 0; i < N; i++) {
            // Evenly distribute actions across the allocated piece duration budget.
            // The final Hard Drop (index N-1) completes exactly at the end of the duration budget (1000 / PPS ms).
            const actionTime = this.nextAvailableStartTime + (i + 1) * (duration / N);
            this.pendingActions.push({
                action: actions[i],
                time: actionTime
            });
        }

        this.nextAvailableStartTime += duration;
    }

    clearLeftoverActions() {
        this.pendingActions = [];
    }

    clearQueue() {
        this.pendingActions = [];
        this.elapsedTime = 0;
        this.nextAvailableStartTime = 0;
    }

    update(dt) {
        this.elapsedTime += dt;

        // Execute any actions whose scheduled time has arrived
        while (this.pendingActions.length > 0 && this.pendingActions[0].time <= this.elapsedTime) {
            const item = this.pendingActions.shift();
            this.inputProvider.executeAction(item.action);
        }
    }
}

// Helper to get rotation matrix of any piece type
function getPieceMatrix(type, rot) {
    let matrix = JSON.parse(JSON.stringify(SHAPES[type]));
    for (let i = 0; i < rot; i++) {
        matrix = rotateMatrixCW(type, matrix);
    }
    return matrix;
}

function rotateMatrixCW(type, matrix) {
    if (type === 'O') return matrix;
    const size = matrix.length;
    let newMatrix = Array.from({ length: size }, () => Array(size).fill(0));
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            newMatrix[c][size - 1 - r] = matrix[r][c];
        }
    }
    return newMatrix;
}

// Generate all physically reachable placements using BFS path search
function generateAllPlacements(game, pieceType, grid) {
    let startX = 3, startY = -1;
    if (pieceType === 'O') { startX = 4; startY = -1; }

    const currentMode = game.currentMode;

    const isValid = (matrix, px, py) => {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c] !== 0) {
                    let boardX = px + c;
                    let boardY = py + r;
                    if (boardX < 0 || boardX >= 10 || boardY >= 20) return false;
                    if (boardY >= 0 && grid[boardY][boardX] !== 0) return false;
                }
            }
        }
        return true;
    };

    const startMatrix = SHAPES[pieceType];
    if (!isValid(startMatrix, startX, startY)) {
        return [];
    }

    const queue = [];
    const visited = new Set();

    queue.push({
        x: startX,
        y: startY,
        rot: 0,
        actions: []
    });
    visited.add(`${startX},${startY},0`);

    const placementsMap = new Map();

    while (queue.length > 0) {
        const s = queue.shift();

        // Simulate drop from this state to get a placement candidate
        let dropX = s.x;
        let dropY = s.y;
        let dropRot = s.rot;
        let dropMatrix = getPieceMatrix(pieceType, dropRot);
        
        while (isValid(dropMatrix, dropX, dropY + 1)) {
            dropY++;
        }

        const placementKey = `${dropX},${dropY},${dropRot}`;
        if (!placementsMap.has(placementKey)) {
            placementsMap.set(placementKey, {
                x: dropX,
                y: dropY,
                rot: dropRot,
                actions: [...s.actions, 'hardDrop']
            });
        } else {
            const existing = placementsMap.get(placementKey);
            if (s.actions.length + 1 < existing.actions.length) {
                placementsMap.set(placementKey, {
                    x: dropX,
                    y: dropY,
                    rot: dropRot,
                    actions: [...s.actions, 'hardDrop']
                });
            }
        }

        // Neighbors Transitions (standard left, right, soft drop and SRS rotations)
        // Left
        if (isValid(dropMatrix, s.x - 1, s.y)) {
            const key = `${s.x - 1},${s.y},${s.rot}`;
            if (!visited.has(key)) {
                visited.add(key);
                queue.push({ x: s.x - 1, y: s.y, rot: s.rot, actions: [...s.actions, 'left'] });
            }
        }
        // Right
        if (isValid(dropMatrix, s.x + 1, s.y)) {
            const key = `${s.x + 1},${s.y},${s.rot}`;
            if (!visited.has(key)) {
                visited.add(key);
                queue.push({ x: s.x + 1, y: s.y, rot: s.rot, actions: [...s.actions, 'right'] });
            }
        }
        // Down
        if (isValid(dropMatrix, s.x, s.y + 1)) {
            const key = `${s.x},${s.y + 1},${s.rot}`;
            if (!visited.has(key)) {
                visited.add(key);
                queue.push({ x: s.x, y: s.y + 1, rot: s.rot, actions: [...s.actions, 'down'] });
            }
        }
        // Rotate CW
        {
            let temp = { type: pieceType, matrix: JSON.parse(JSON.stringify(dropMatrix)), x: s.x, y: s.y, rotationState: s.rot };
            if (rotatePieceSim(temp, 'CW', grid, currentMode)) {
                const key = `${temp.x},${temp.y},${temp.rotationState}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push({ x: temp.x, y: temp.y, rot: temp.rotationState, actions: [...s.actions, 'cw'] });
                }
            }
        }
        // Rotate CCW
        {
            let temp = { type: pieceType, matrix: JSON.parse(JSON.stringify(dropMatrix)), x: s.x, y: s.y, rotationState: s.rot };
            if (rotatePieceSim(temp, 'CCW', grid, currentMode)) {
                const key = `${temp.x},${temp.y},${temp.rotationState}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push({ x: temp.x, y: temp.y, rot: temp.rotationState, actions: [...s.actions, 'ccw'] });
                }
            }
        }
        // Rotate 180
        {
            let temp = { type: pieceType, matrix: JSON.parse(JSON.stringify(dropMatrix)), x: s.x, y: s.y, rotationState: s.rot };
            if (rotatePieceSim(temp, '180', grid, currentMode)) {
                const key = `${temp.x},${temp.y},${temp.rotationState}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push({ x: temp.x, y: temp.y, rot: temp.rotationState, actions: [...s.actions, 'rotate180'] });
                }
            }
        }
    }

    return Array.from(placementsMap.values());
}

// Micro-fast lookahead placement generator for second ply (no BFS path needed)
function getFastPlacements(pieceType, grid) {
    const placements = [];
    const rotCount = (pieceType === 'O') ? 1 : (['I', 'S', 'Z'].includes(pieceType) ? 2 : 4);
    
    for (let rot = 0; rot < rotCount; rot++) {
        const matrix = getPieceMatrix(pieceType, rot);
        const size = matrix.length;
        
        let minC = size;
        let maxC = -1;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (matrix[r][c] !== 0) {
                    if (c < minC) minC = c;
                    if (c > maxC) maxC = c;
                }
            }
        }
        
        const colWidth = maxC - minC + 1;
        const startX = -minC;
        const endX = 10 - minC - colWidth;
        
        for (let x = startX; x <= endX; x++) {
            let y = -1;
            
            const collides = (px, py) => {
                for (let r = 0; r < size; r++) {
                    for (let c = 0; c < size; c++) {
                        if (matrix[r][c] !== 0) {
                            const bx = px + c;
                            const by = py + r;
                            if (bx < 0 || bx >= 10 || by >= 20) return true;
                            if (by >= 0 && grid[by][bx] !== 0) return true;
                        }
                    }
                }
                return false;
            };
            
            if (collides(x, y)) continue;
            
            while (!collides(x, y + 1)) {
                y++;
            }
            
            placements.push({ x, y, rot });
        }
    }
    return placements;
}

// Simulates a single placement on a grid copy and returns post-clear grid and El-Tetris evaluation
function simulatePlacement(baseGrid, pieceType, targetX, targetY, targetRot, currentMode) {
    const grid = baseGrid.map(row => [...row]);
    const matrix = getPieceMatrix(pieceType, targetRot);

    // Compute holes and cover count on the pre-placement baseGrid for delta comparison
    let preHoles = 0;
    let preCoverCount = 0;
    for (let c = 0; c < 10; c++) {
        let blocksInCol = 0;
        let hasBlockForHoles = false;
        for (let r = 0; r < 20; r++) {
            if (baseGrid[r][c] !== 0) {
                blocksInCol++;
                hasBlockForHoles = true;
            } else {
                if (blocksInCol > 0) {
                    preCoverCount += blocksInCol;
                }
                if (hasBlockForHoles) {
                    preHoles++;
                }
            }
        }
    }

    const pieceCells = [];
    const size = matrix.length;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (matrix[r][c] !== 0) {
                pieceCells.push({ x: targetX + c, y: targetY + r });
            }
        }
    }

    let isValid = true;
    pieceCells.forEach(cell => {
        if (cell.x < 0 || cell.x >= 10 || cell.y >= 20) isValid = false;
        if (cell.y >= 0 && grid[cell.y][cell.x] !== 0) isValid = false;
    });

    if (!isValid) return null;

    pieceCells.forEach(cell => {
        if (cell.y >= 0) {
            grid[cell.y][cell.x] = 1;
        }
    });

    let linesCleared = 0;
    const clearedRows = [];
    for (let r = 0; r < 20; r++) {
        if (grid[r].every(val => val !== 0)) {
            linesCleared++;
            clearedRows.push(r);
        }
    }

    let cellsOfPlacedPieceCleared = 0;
    if (linesCleared > 0) {
        pieceCells.forEach(cell => {
            if (clearedRows.includes(cell.y)) {
                cellsOfPlacedPieceCleared++;
            }
        });
    }
    const erodedPieceCells = linesCleared * cellsOfPlacedPieceCleared;

    const postClearGrid = [];
    for (let r = 0; r < 20; r++) {
        if (!grid[r].every(val => val !== 0)) {
            postClearGrid.push([...grid[r]]);
        }
    }
    while (postClearGrid.length < 20) {
        postClearGrid.unshift(Array(10).fill(0));
    }

    let sumY = 0;
    pieceCells.forEach(cell => {
        sumY += (20 - cell.y);
    });
    const landingHeight = sumY / pieceCells.length;

    let rowTransitions = 0;
    for (let r = 0; r < 20; r++) {
        for (let c = -1; c < 10; c++) {
            const cell1 = (c < 0) ? true : (postClearGrid[r][c] !== 0);
            const cell2 = (c + 1 >= 10) ? true : (postClearGrid[r][c+1] !== 0);
            if (cell1 !== cell2) {
                rowTransitions++;
            }
        }
    }

    let colTransitions = 0;
    for (let c = 0; c < 10; c++) {
        for (let r = -1; r < 20; r++) {
            const cell1 = (r < 0) ? false : (postClearGrid[r][c] !== 0);
            const cell2 = (r + 1 >= 20) ? true : (postClearGrid[r+1][c] !== 0);
            if (cell1 !== cell2) {
                colTransitions++;
            }
        }
    }

    let holes = 0;
    for (let c = 0; c < 10; c++) {
        let hasBlock = false;
        for (let r = 0; r < 20; r++) {
            if (postClearGrid[r][c] !== 0) {
                hasBlock = true;
            } else if (hasBlock) {
                holes++;
            }
        }
    }

    // Compute column heights
    const colHeights = Array(10).fill(0);
    for (let c = 0; c < 10; c++) {
        for (let r = 0; r < 20; r++) {
            if (postClearGrid[r][c] !== 0) {
                colHeights[c] = 20 - r;
                break;
            }
        }
    }

    // Find primary well column and its depth dynamically
    let primaryWellColumn = -1;
    let primaryWellDepth = 0;
    for (let c = 0; c < 10; c++) {
        let colHoles = 0;
        let hasBlock = false;
        for (let r = 0; r < 20; r++) {
            if (postClearGrid[r][c] !== 0) {
                hasBlock = true;
            } else if (hasBlock) {
                colHoles++;
            }
        }
        if (colHoles === 0) {
            const leftHeight = (c === 0) ? 20 : colHeights[c - 1];
            const rightHeight = (c === 9) ? 20 : colHeights[c + 1];
            const depth = Math.max(0, Math.min(leftHeight, rightHeight) - colHeights[c]);
            if (depth > primaryWellDepth) {
                primaryWellDepth = depth;
                primaryWellColumn = c;
            }
        }
    }

    let wellsSum = 0;
    for (let c = 0; c < 10; c++) {
        if (c === primaryWellColumn) continue; // Exclude primary well from negative wellsSum penalty
        let depth = 0;
        for (let r = 0; r < 20; r++) {
            if (postClearGrid[r][c] === 0) {
                const leftIsWallOrOccupied = (c === 0) || (postClearGrid[r][c-1] !== 0);
                const rightIsWallOrOccupied = (c === 9) || (postClearGrid[r][c+1] !== 0);
                if (leftIsWallOrOccupied && rightIsWallOrOccupied) {
                    depth++;
                    wellsSum += depth;
                } else {
                    depth = 0;
                }
            } else {
                depth = 0;
            }
        }
    }

    let nonICellsInWell = 0;
    if (pieceType !== 'I' && primaryWellColumn !== -1) {
        pieceCells.forEach(cell => {
            if (cell.x === primaryWellColumn && cell.y >= 0) {
                nonICellsInWell++;
            }
        });
    }

    let maxColHeight = 0;
    for (let c = 0; c < 10; c++) {
        if (colHeights[c] > maxColHeight) {
            maxColHeight = colHeights[c];
        }
    }
    const safetyFactor = Math.max(0, Math.min(1, 1 - (maxColHeight - 8) / 8));

    // Compute accessibility penalty (blocks covering holes)
    let totalCoverCount = 0;
    for (let c = 0; c < 10; c++) {
        let blocksInCol = 0;
        for (let r = 0; r < 20; r++) {
            if (postClearGrid[r][c] !== 0) {
                blocksInCol++;
            } else {
                if (blocksInCol > 0) {
                    totalCoverCount += blocksInCol;
                }
            }
        }
    }

    // --- Dynamic Strategy Layer ---
    // 1. Recover Factor (Urgency of vertical danger)
    const recoverFactor = 1.0 - safetyFactor;

    // 2. Downstack Factor (Urgency of dealing with buried holes)
    const downstackFactor = Math.min(1.0, (holes * 0.25) + (totalCoverCount * 0.05));

    // 3. Attack Factor (Capability of playing pure offense)
    const attackFactor = safetyFactor * (1.0 - downstackFactor);

    // Compute hole delta and accessibility delta to prevent burying recoverable holes
    const holeDelta = holes - preHoles;
    const accessibilityDelta = totalCoverCount - preCoverCount;

    let holeDeltaPenalty = 0;
    if (holeDelta > 0) {
        // Penalty for creating new holes (scaled by downstack urgency)
        holeDeltaPenalty = holeDelta * -50.0 * (1.0 + downstackFactor * 0.5);
    } else if (holeDelta < 0) {
        // Reward for resolving/clearing existing holes (scaled by downstack urgency)
        holeDeltaPenalty = holeDelta * -30.0 * (1.0 + downstackFactor * 1.0);
    }

    let accessibilityDeltaPenalty = 0;
    if (accessibilityDelta > 0) {
        // Penalty for burying holes deeper / sealing them off (scaled by downstack urgency)
        accessibilityDeltaPenalty = accessibilityDelta * -20.0 * (1.0 + downstackFactor * 0.5);
    } else if (accessibilityDelta < 0) {
        // Reward for opening up/unburying holes (scaled by downstack urgency)
        accessibilityDeltaPenalty = accessibilityDelta * -15.0 * (1.0 + downstackFactor * 1.0);
    }

    // Compute bumpiness and cliff penalty to maintain a clean, stable and recoverable board shape.
    // This naturally prevents "Eiffel Tower" peaks and discourages vertical I-piece placements, as well as overcommitting to bad shapes.
    let bumpiness = 0;
    let cliffPenalty = 0;
    for (let c = 0; c < 9; c++) {
        const isWellBoundary = (primaryWellColumn !== -1) && (c === primaryWellColumn || c + 1 === primaryWellColumn);
        const diff = Math.abs(colHeights[c] - colHeights[c+1]);
        if (isWellBoundary) {
            // At well boundaries, we expect a difference.
            // We only penalize if it's an extreme cliff (> 4) which is highly unstable and dangerous.
            if (diff > 4) {
                cliffPenalty += Math.pow(diff - 4, 2) * 5.0;
            }
        } else {
            // Non-well adjacent columns should remain as flat as possible.
            // Difference of 0 or 1 is excellent. Difference >= 2 is penalized continuously and quadratically.
            bumpiness += diff;
            if (diff > 1) {
                cliffPenalty += Math.pow(diff - 1, 2) * 4.0;
            }
        }
    }

    // Dynamic weight adjustments
    const lhWeight = -4.500158825082766;
    const epcWeight = 3.4181268101392694;
    const rtWeight = -3.2178882868487753;
    const ctWeight = -9.348695305445199;
    
    // Scale up hole penalty during downstack to avoid placing blocks over holes
    const dynamicHWeight = -7.899265427351652 * (1.0 + downstackFactor * 0.5);
    const wWeight = -3.3855952525947258;

    const dynamicBumpinessWeight = -1.5 * (1.0 + recoverFactor * 0.5);
    const dynamicCliffPenaltyWeight = -1.2 * (1.0 + recoverFactor * 1.0);

    // Swiss Cheese Prevention: soft heuristic penalty for scattering holes horizontally across multiple columns on the same row.
    // Human players prefer keeping mistakes vertically aligned.
    let swissCheesePenalty = 0;
    for (let r = 0; r < 20; r++) {
        let holeColsCount = 0;
        for (let c = 0; c < 10; c++) {
            if (postClearGrid[r][c] === 0 && r > (20 - colHeights[c])) {
                holeColsCount++;
            }
        }
        if (holeColsCount >= 2) {
            swissCheesePenalty += Math.pow(holeColsCount - 1, 2);
        }
    }
    const dynamicSwissCheeseWeight = -6.0 * (1.0 + downstackFactor * 0.5);

    // Well reward: heavily scaled down when downstack or recover is urgent
    let wellReward = Math.min(4, primaryWellDepth) * 20.0 * safetyFactor * (1.0 - downstackFactor * 0.8);
    
    // Non-I cells in well penalty: reduced when survival is critical (recoverFactor is high)
    let nonICellsPenalty = nonICellsInWell * -25.0 * safetyFactor * (1.0 - recoverFactor * 0.6);
    
    // Accessibility: extremely important during downstacking
    const accessibilityMultiplier = 1.0 + downstackFactor * 2.0;
    let accessibilityPenalty = totalCoverCount * -12.0 * accessibilityMultiplier;

    // Waste I piece penalty: human players avoid wasting an I piece on weak clears unless they must survive
    let wasteIPenalty = 0;
    if (pieceType === 'I') {
        if (linesCleared > 0 && linesCleared < 4) {
            wasteIPenalty = (4 - linesCleared) * -35.0 * safetyFactor;
        } else if (linesCleared === 0) {
            if (primaryWellDepth >= 3) {
                // Wasting an I piece to clear 0 lines when a deep well is open is highly penalized
                wasteIPenalty = -60.0 * safetyFactor;
            } else {
                // Even without a deep well, we prefer holding or flatly building with I
                wasteIPenalty = -25.0 * safetyFactor;
            }
        }
    }

    // Clear rewards and penalties
    let clearRewardOrPenalty = 0;
    const survivalUrgency = Math.max(recoverFactor, downstackFactor);

    if (linesCleared === 4) {
        clearRewardOrPenalty = 60.0 + (safetyFactor * 20.0);
    } else if (linesCleared > 0 && linesCleared < 4) {
        // Base penalties for non-Quad clears under safe, clean conditions (survivalUrgency = 0)
        let basePenalty = 0;
        if (linesCleared === 3) basePenalty = -3.0;
        else if (linesCleared === 2) basePenalty = -8.0;
        else if (linesCleared === 1) basePenalty = -18.0;

        // Positive survival/skimming rewards under critical conditions (survivalUrgency = 1)
        let maxUrgentReward = 0;
        if (linesCleared === 3) maxUrgentReward = 35.0;
        else if (linesCleared === 2) maxUrgentReward = 25.0;
        else if (linesCleared === 1) maxUrgentReward = 15.0;

        // Smoothly interpolate based on survivalUrgency to transition from B2B preservation to defensive skimming
        clearRewardOrPenalty = basePenalty + (maxUrgentReward - basePenalty) * survivalUrgency;
    }

    // Danger clear bonus: reward any line clears when in high-stack emergency (fully continuous)
    if (linesCleared > 0) {
        clearRewardOrPenalty += linesCleared * 12.0 * Math.pow(recoverFactor, 1.5);
    }

    // Hole-aware Survival Evaluation: adjust clear reward based on recoverability change
    if (linesCleared > 0) {
        // Negative delta is good (holes removed/unburied), so subtract it to make the reward positive
        const recoverabilityDelta = - (holeDelta * 25.0) - (accessibilityDelta * 8.0);
        // During survival emergency (high recoverFactor), this factor is scaled up to prioritize clean recovery
        const emergencyMultiplier = 1.0 + recoverFactor * 1.5;
        clearRewardOrPenalty += recoverabilityDelta * emergencyMultiplier;
    }

    const score = (landingHeight * lhWeight) +
                  (erodedPieceCells * epcWeight) +
                  (rowTransitions * rtWeight) +
                  (colTransitions * ctWeight) +
                  (holes * dynamicHWeight) +
                  (wellsSum * wWeight) +
                  (bumpiness * dynamicBumpinessWeight) +
                  (cliffPenalty * dynamicCliffPenaltyWeight) +
                  (swissCheesePenalty * dynamicSwissCheeseWeight) +
                  wellReward +
                  nonICellsPenalty +
                  accessibilityPenalty +
                  wasteIPenalty +
                  clearRewardOrPenalty +
                  holeDeltaPenalty +
                  accessibilityDeltaPenalty;

    let isAllClear = false;
    if (linesCleared > 0) {
        isAllClear = true;
        for (let r = 0; r < 20; r++) {
            if (!clearedRows.includes(r)) {
                if (!grid[r].every(val => val === 0)) {
                    isAllClear = false;
                    break;
                }
            }
        }
    }

    return {
        score: score,
        postGrid: postClearGrid,
        finalMatrix: matrix,
        linesCleared: linesCleared,
        isAllClear: isAllClear,
        wellDepth: primaryWellDepth,
        safetyFactor: safetyFactor,
        features: {
            landingHeight,
            erodedPieceCells,
            rowTransitions,
            colTransitions,
            holes,
            wellsSum
        }
    };
}

function getHoldBonus(holdPiece, wellDepth, safetyFactor) {
    if (!holdPiece) return 0;
    
    let bonus = 0;
    if (holdPiece === 'I') {
        if (wellDepth >= 3) {
            bonus += 60.0 * safetyFactor;
        } else if (wellDepth >= 1) {
            bonus += 40.0 * safetyFactor;
        } else {
            bonus += 25.0 * safetyFactor;
        }
    } else if (holdPiece === 'T') {
        bonus += 12.0 * safetyFactor;
    }
    return bonus;
}

// 1-ply lookahead helper to score a placement candidate with unified attack-aware evaluation
function evaluatePly1Candidate(game, rootPieceType, x1, y1, rot1, nextPieceType, resultingHoldPiece = null) {
    const currentMode = game.currentMode;
    const sim1 = simulatePlacement(game.grid, rootPieceType, x1, y1, rot1, currentMode);
    if (!sim1) return -Infinity;

    const fastPlacements = getFastPlacements(nextPieceType, sim1.postGrid);
    let bestJointScore = -Infinity;

    const cleared1 = sim1.linesCleared;
    const isAllClear1 = sim1.isAllClear;
    const attack1 = game.calculateAttackValue(cleared1, isAllClear1, false, false, rootPieceType);

    let nextCombo = game.combo;
    let nextB2B = game.b2bCount;

    if (cleared1 > 0) {
        nextCombo = game.combo + 1;
        const isDifficult1 = (cleared1 === 4);
        if (isDifficult1) {
            nextB2B = game.b2bCount + 1;
        } else {
            nextB2B = 0;
        }
    } else {
        nextCombo = 0;
    }

    fastPlacements.forEach(p2 => {
        const sim2 = simulatePlacement(sim1.postGrid, nextPieceType, p2.x, p2.y, p2.rot, currentMode);
        if (sim2) {
            const cleared2 = sim2.linesCleared;
            const isAllClear2 = sim2.isAllClear;
            const attack2 = game.calculateAttackValue(cleared2, isAllClear2, false, false, nextPieceType, nextCombo, nextB2B);

            // Calculate attack score
            const totalAttack = attack1 + attack2;
            let attackScore = totalAttack * 18.0;

            let finalNextB2B = nextB2B;
            let finalNextCombo = nextCombo;
            if (cleared2 > 0) {
                finalNextCombo = nextCombo + 1;
                const isDifficult2 = (cleared2 === 4);
                if (isDifficult2) {
                    finalNextB2B = nextB2B + 1;
                } else {
                    finalNextB2B = 0;
                }
            } else {
                finalNextCombo = 0;
            }

            if (finalNextB2B >= 1) {
                attackScore += 12.0;
            }

            if (finalNextCombo > 0) {
                attackScore += finalNextCombo * 6.0;
            }

            if (isAllClear1 || isAllClear2) {
                attackScore += 150.0;
            }

            // Unhealthiness / Safety multiplier
            let maxColHeight = 0;
            for (let c = 0; c < 10; c++) {
                let colHeight = 0;
                for (let r = 0; r < 20; r++) {
                    if (sim1.postGrid[r][c] !== 0) {
                        colHeight = 20 - r;
                        break;
                    }
                }
                if (colHeight > maxColHeight) {
                    maxColHeight = colHeight;
                }
            }

            let safetyMultiplier = 1.0;
            if (maxColHeight > 10) {
                safetyMultiplier *= Math.max(0, 1.0 - (maxColHeight - 10) * 0.1);
            }
            const holesCount = sim1.features.holes;
            if (holesCount > 0) {
                safetyMultiplier *= Math.max(0, 1.0 - holesCount * 0.2);
            }

            attackScore *= safetyMultiplier;

            // Joint score is SurvivalScore1 + SurvivalScore2 + AttackScore
            const jointScore = sim1.score + sim2.score + attackScore;
            if (jointScore > bestJointScore) {
                bestJointScore = jointScore;
            }
        }
    });

    if (bestJointScore === -Infinity) {
        return sim1.score - 5000; // Penalty for locking out lookahead piece
    }

    const holdBonus = getHoldBonus(resultingHoldPiece, sim1.wellDepth, sim1.safetyFactor);
    return bestJointScore + holdBonus;
}

export class DebugAI {
    constructor(gameInstance, ppsScheduler) {
        this.game = gameInstance;
        this.scheduler = ppsScheduler;
        this.lastPiece = null;
    }

    update(dt) {
        if (!this.game || !this.game.gameActive || this.game.countdownActive) {
            return;
        }

        if (this.game.currentPiece && this.lastPiece !== this.game.currentPiece) {
            this.scheduler.clearLeftoverActions();
            const planResult = this.plan();
            this.scheduler.queueActions(planResult.actions);
            this.lastPiece = this.game.currentPiece;

            const debugCheckbox = document.getElementById('aiDebugOverlayCheckbox');
            const showOverlay = debugCheckbox ? debugCheckbox.checked : false;

            this.game.aiDebugData = {
                show: showOverlay,
                score: planResult.score,
                evaluatedCount: planResult.evaluatedCount,
                target: planResult.target
            };
        }

        this.scheduler.update(dt);
    }

    plan() {
        if (!this.game.currentPiece) {
            return { actions: ['hardDrop'], score: -999999, evaluatedCount: 0, target: null };
        }

        const currentType = this.game.currentPiece.type;
        const nextPiece1 = (this.game.nextQueue && this.game.nextQueue.length > 0) ? this.game.nextQueue[0] : 'I';
        const nextPiece2 = (this.game.nextQueue && this.game.nextQueue.length > 1) ? this.game.nextQueue[1] : 'I';

        let totalEvaluations = 0;

        // --- Option A: No Hold (Active Piece) ---
        const placementsNoHold = generateAllPlacements(this.game, currentType, this.game.grid);
        totalEvaluations += placementsNoHold.length;

        let bestNoHoldCandidate = null;
        let bestNoHoldScore = -Infinity;

        placementsNoHold.forEach(cand => {
            const lookaheadScore = evaluatePly1Candidate(this.game, currentType, cand.x, cand.y, cand.rot, nextPiece1, this.game.holdPiece);
            cand.score = lookaheadScore;
            
            // Get landing matrix details for telemetry rendering
            const sim = simulatePlacement(this.game.grid, currentType, cand.x, cand.y, cand.rot, this.game.currentMode);
            if (sim) {
                cand.targetMatrix = sim.finalMatrix;
            }

            if (lookaheadScore > bestNoHoldScore) {
                bestNoHoldScore = lookaheadScore;
                bestNoHoldCandidate = cand;
            }
        });

        // --- Option B: Hold Piece ---
        let bestHoldCandidate = null;
        let bestHoldScore = -Infinity;
        let canHold = !this.game.hasHeld;

        let holdPieceType = null;
        let holdNextPieceType = null;

        if (canHold) {
            if (this.game.holdPiece) {
                holdPieceType = this.game.holdPiece;
                holdNextPieceType = nextPiece1;
            } else {
                holdPieceType = nextPiece1;
                holdNextPieceType = nextPiece2;
            }

            const placementsHold = generateAllPlacements(this.game, holdPieceType, this.game.grid);
            totalEvaluations += placementsHold.length;

            placementsHold.forEach(cand => {
                const lookaheadScore = evaluatePly1Candidate(this.game, holdPieceType, cand.x, cand.y, cand.rot, holdNextPieceType, currentType);
                cand.score = lookaheadScore;

                const sim = simulatePlacement(this.game.grid, holdPieceType, cand.x, cand.y, cand.rot, this.game.currentMode);
                if (sim) {
                    cand.targetMatrix = sim.finalMatrix;
                }

                if (lookaheadScore > bestHoldScore) {
                    bestHoldScore = lookaheadScore;
                    bestHoldCandidate = cand;
                }
            });
        }

        // --- Comparison & Decision ---
        // If holding yields a strictly better joint score, execute the hold action first.
        if (canHold && bestHoldScore > bestNoHoldScore) {
            return {
                actions: ['hold'],
                score: bestHoldScore,
                evaluatedCount: totalEvaluations,
                target: null // Hold triggers immediate swap, next tick will re-plan
            };
        }

        // If we can't hold or placing active piece is better
        if (!bestNoHoldCandidate) {
            return { actions: ['hardDrop'], score: -999999, evaluatedCount: totalEvaluations, target: null };
        }

        return {
            actions: bestNoHoldCandidate.actions,
            score: bestNoHoldScore,
            evaluatedCount: totalEvaluations,
            target: {
                x: bestNoHoldCandidate.x,
                y: bestNoHoldCandidate.y,
                rot: bestNoHoldCandidate.rot,
                type: currentType,
                matrix: bestNoHoldCandidate.targetMatrix
            }
        };
    }
}

