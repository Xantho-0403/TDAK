import { SHAPES, KICK_DATA_NORMAL, KICK_DATA_I } from './constants.js';

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
            'ShiftLeft': 'hold'
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
        this.rebindTarget = null;
    }

    saveKeyBindings() {
        localStorage.setItem('tetris_key_bindings', JSON.stringify(this.keyBindings));
    }

    loadKeyBindings() {
        try {
            const stored = localStorage.getItem('tetris_key_bindings');
            if (stored) {
                this.keyBindings = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load key bindings', e);
        }
    }

    handleKeyDown(code) {
        if (this.isModalOpen) return; 
        if (this.rebindTarget) { this.executeRebind(code); return; }
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

// Helper function to simulate a placement on a grid copy and compute features + score
function simulateCandidate(game, candidate) {
    const grid = game.grid.map(row => [...row]);
    const currentMode = game.currentMode;

    let piece = {
        type: game.currentPiece.type,
        matrix: JSON.parse(JSON.stringify(game.currentPiece.matrix)),
        x: game.currentPiece.x,
        y: game.currentPiece.y,
        rotationState: game.currentPiece.rotationState
    };

    // 1. Apply rotations
    if (candidate.rot === 1) {
        rotatePieceSim(piece, 'CW', grid, currentMode);
    } else if (candidate.rot === 2) {
        rotatePieceSim(piece, '180', grid, currentMode);
    } else if (candidate.rot === 3) {
        rotatePieceSim(piece, 'CCW', grid, currentMode);
    }

    // 2. Apply horizontal movement to targetX
    const dx = candidate.x - piece.x;
    const step = dx > 0 ? 1 : -1;
    const absDx = Math.abs(dx);
    for (let i = 0; i < absDx; i++) {
        movePieceSim(piece, step, 0, grid, currentMode);
    }

    // 3. Drop
    dropPieceSim(piece, grid, currentMode);

    // Save final placed piece cells coordinates
    const pieceCells = [];
    const matrix = piece.matrix;
    const size = matrix.length;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (matrix[r][c] !== 0) {
                pieceCells.push({ x: piece.x + c, y: piece.y + r });
            }
        }
    }

    // Check if placement is out of bounds or collides
    let isValid = true;
    pieceCells.forEach(cell => {
        if (cell.x < 0 || cell.x >= 10 || cell.y >= 20) isValid = false;
        if (cell.y >= 0 && grid[cell.y][cell.x] !== 0) isValid = false;
    });

    if (!isValid) return null;

    // Temporarily place the piece on the grid to calculate features
    pieceCells.forEach(cell => {
        if (cell.y >= 0) {
            grid[cell.y][cell.x] = 1; // Mark as occupied
        }
    });

    // Check lines cleared
    let linesCleared = 0;
    const clearedRows = [];
    for (let r = 0; r < 20; r++) {
        if (grid[r].every(val => val !== 0)) {
            linesCleared++;
            clearedRows.push(r);
        }
    }

    // Calculate eroded piece cells
    let cellsOfPlacedPieceCleared = 0;
    if (linesCleared > 0) {
        pieceCells.forEach(cell => {
            if (clearedRows.includes(cell.y)) {
                cellsOfPlacedPieceCleared++;
            }
        });
    }
    const erodedPieceCells = linesCleared * cellsOfPlacedPieceCleared;

    // Create post-line-clear grid
    const postClearGrid = [];
    for (let r = 0; r < 20; r++) {
        if (!grid[r].every(val => val !== 0)) {
            postClearGrid.push([...grid[r]]);
        }
    }
    while (postClearGrid.length < 20) {
        postClearGrid.unshift(Array(10).fill(0));
    }

    // Now calculate features on postClearGrid
    // 1. Landing Height: average height of cells of placed piece
    let sumY = 0;
    pieceCells.forEach(cell => {
        sumY += (20 - cell.y); // height relative to the floor (row 19 is height 1)
    });
    const landingHeight = sumY / pieceCells.length;

    // 2. Row Transitions
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

    // 3. Column Transitions
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

    // 4. Holes
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

    // 5. Wells depth sum
    let wellsSum = 0;
    for (let c = 0; c < 10; c++) {
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

    // Heuristic Score Calculation using optimized El-Tetris weights
    const lhWeight = -4.500158825082766;
    const epcWeight = 3.4181268101392694;
    const rtWeight = -3.2178882868487753;
    const ctWeight = -9.348695305445199;
    const hWeight = -7.899265427351652;
    const wWeight = -3.3855952525947258;

    const score = (landingHeight * lhWeight) +
                  (erodedPieceCells * epcWeight) +
                  (rowTransitions * rtWeight) +
                  (colTransitions * ctWeight) +
                  (holes * hWeight) +
                  (wellsSum * wWeight);

    return {
        score: score,
        finalMatrix: piece.matrix,
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

            // Update AI overlay data on the game instance
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

        const candidates = [];

        // Try all 4 rotations (0, 1, 2, 3) and columns (from -4 to 9)
        for (let rot = 0; rot < 4; rot++) {
            for (let x = -4; x < 10; x++) {
                const placement = getPlacementSim(this.game, rot, x);
                if (placement !== null) {
                    const isDup = candidates.some(c => c.x === placement.x && c.y === placement.y && c.rot === placement.rot);
                    if (!isDup) {
                        candidates.push(placement);
                    }
                }
            }
        }

        if (candidates.length === 0) {
            return { actions: ['hardDrop'], score: -999999, evaluatedCount: 0, target: null };
        }

        let bestCandidate = null;
        let bestScore = -Infinity;

        candidates.forEach(candidate => {
            const simResult = simulateCandidate(this.game, candidate);
            if (simResult !== null) {
                candidate.score = simResult.score;
                candidate.features = simResult.features;
                candidate.targetMatrix = simResult.finalMatrix;
                if (simResult.score > bestScore) {
                    bestScore = simResult.score;
                    bestCandidate = candidate;
                }
            }
        });

        if (!bestCandidate) {
            return { actions: ['hardDrop'], score: -999999, evaluatedCount: candidates.length, target: null };
        }

        return {
            actions: bestCandidate.actions,
            score: bestCandidate.score,
            evaluatedCount: candidates.length,
            target: {
                x: bestCandidate.x,
                y: bestCandidate.y,
                rot: bestCandidate.rot,
                type: this.game.currentPiece.type,
                matrix: bestCandidate.targetMatrix
            }
        };
    }
}
