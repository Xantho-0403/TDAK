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
