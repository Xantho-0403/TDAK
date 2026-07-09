import { TetrisGame } from './game-engine.js';
import { Renderer } from './renderer.js';
import { KeyboardInput } from './input.js';

// Global instances
const engine = new TetrisGame();
const renderer = new Renderer();
const inputHandler = new KeyboardInput();

// Helper: Format milliseconds into MM:SS.hh
function formatTime(ms) {
    let totalSeconds = Math.floor(ms / 1000);
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;
    let msecs = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(msecs).padStart(2, '0')}`;
}

// Session history for 40Lines mode
function saveSessionHistory(timeMs) {
    let history = [];
    try {
        history = JSON.parse(localStorage.getItem('tetris_40l_history')) || [];
    } catch (e) {
        history = [];
    }
    history.push(timeMs);
    if (history.length > 15) history = history.slice(history.length - 15);
    localStorage.setItem('tetris_40l_history', JSON.stringify(history));
}

// Visual effect on canvas for Personal Best records
function triggerPBFlash() {
    const canvasEl = document.getElementById('tetrisCanvas');
    if (!canvasEl) return;
    canvasEl.classList.remove('pb-flash');
    void canvasEl.offsetWidth; 
    canvasEl.classList.add('pb-flash');
    setTimeout(() => canvasEl.classList.remove('pb-flash'), 1300);
}

// UI: Modal controls and modes select
function openModal() {
    inputHandler.isModalOpen = true;
    document.getElementById('modeModal').classList.add('open');
    
    const best40l = localStorage.getItem('best_record_40l');
    document.getElementById('record-40l').innerText = best40l ? `PB: ${formatTime(parseInt(best40l))}` : `PB: --:--.--`;
    document.getElementById('record-4w').innerText = `Max Combo: ${localStorage.getItem('max_combo_4w') || 0}`;
    
    const bestCheese = localStorage.getItem('best_record_cheese');
    document.getElementById('record-cheese').innerText = bestCheese ? `PB: ${formatTime(parseInt(bestCheese))}` : `PB: --:--.--`;

    let history = [];
    try {
        history = JSON.parse(localStorage.getItem('tetris_40l_history')) || [];
    } catch (e) {
        history = [];
    }
    renderer.renderHistoryGraph(history);
}

function closeModal() {
    inputHandler.isModalOpen = false;
    document.getElementById('modeModal').classList.remove('open');
}

function selectMode(modeName) {
    engine.currentMode = modeName;
    closeModal();
    engine.reset();
}

// Global hook for inline HTML onclick attributes
window.game = {
    openModal,
    closeModal,
    selectMode,
    startRebind: (action) => inputHandler.startRebind(action)
};

// UI settings synchronizer
function updateSettings() {
    const das = parseInt(document.getElementById('dasInput').value) || 0;
    const arr = parseInt(document.getElementById('arrInput').value) || 0;
    const sdf = parseInt(document.getElementById('sdfInput').value) || 1;
    
    const delayInput = document.getElementById('clearDelayInput');
    const clearDelay = delayInput ? (parseInt(delayInput.value) || 0) : 0;
    
    engine.lineClearDelay = clearDelay;
    engine.sdf = sdf;
    inputHandler.das = das;
    inputHandler.arr = arr;
    inputHandler.sdf = sdf;
}

// Register DOM inputs listeners
document.getElementById('dasInput').addEventListener('input', updateSettings);
document.getElementById('arrInput').addEventListener('input', updateSettings);
document.getElementById('sdfInput').addEventListener('input', updateSettings);

const delayInputEl = document.getElementById('clearDelayInput');
if (delayInputEl) delayInputEl.addEventListener('input', updateSettings);

// Register skin changes
const skinSelect = document.getElementById('skinSelect');
if (skinSelect) {
    skinSelect.value = renderer.currentSkin;
    skinSelect.addEventListener('change', () => {
        renderer.currentSkin = skinSelect.value;
        localStorage.setItem('tetris_skin', renderer.currentSkin);
    });
}

// Window Keyboard handlers
window.addEventListener('keydown', (e) => {
    if (inputHandler.isModalOpen) return; 
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault();
        if (!inputHandler.rebindTarget) {
            engine.undo();
            return;
        }
    }
    if (e.code === 'KeyR') {
        if (!inputHandler.rebindTarget) {
            e.preventDefault();
            engine.reset();
            return;
        }
    }
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code) || inputHandler.rebindTarget) {
        e.preventDefault();
    }
    inputHandler.handleKeyDown(e.code, engine);
});

window.addEventListener('keyup', (e) => {
    inputHandler.handleKeyUp(e.code);
});

// Sync custom key bindings text labels in HTML key config list
function initKeyBindLabels() {
    for (const key in inputHandler.keyBindings) {
        const action = inputHandler.keyBindings[key];
        const btn = document.getElementById(`btn-${action}`);
        if (btn) {
            btn.innerText = key;
        }
    }
}

// Update Keyboard UI overlay (flashes and actives)
function updateKeyOverlay(dt) {
    for (const k in inputHandler.keyFlash) {
        if (inputHandler.keyFlash[k] > 0) inputHandler.keyFlash[k] -= dt;
    }

    const setActive = (id, active) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle('active', active);
    };

    setActive('key-left', inputHandler.inputs.left);
    setActive('key-right', inputHandler.inputs.right);
    setActive('key-down', inputHandler.inputs.down);
    setActive('key-cw', inputHandler.keyFlash.cw > 0);
    setActive('key-ccw', inputHandler.keyFlash.ccw > 0);
    setActive('key-rotate180', inputHandler.keyFlash.rotate180 > 0);
    setActive('key-hardDrop', inputHandler.keyFlash.hardDrop > 0);
    setActive('key-hold', inputHandler.keyFlash.hold > 0);
}

// Setup core callbacks for the engine
engine.onAction = (text) => {
    document.getElementById('actionDisplay').innerText = text;
};

engine.onUIUpdate = () => {
    document.getElementById('modeDisplay').innerText = engine.currentMode;
    document.getElementById('timerDisplay').innerText = formatTime(engine.elapsedTime);

    const targetLabel = document.getElementById('targetLabel');
    const comboDisplay = document.getElementById('comboDisplay');

    if (engine.currentMode === '40L') {
        targetLabel.innerText = "LINE LEFT";
        comboDisplay.innerText = Math.max(0, 40 - engine.linesClearedTotal);
    } else if (engine.currentMode === 'CHEESE') {
        targetLabel.innerText = "CHEESE LEFT";
        comboDisplay.innerText = engine.cheeseLinesRemaining;
    } else if (engine.currentMode === 'SURVIVAL') {
        targetLabel.innerText = "QUEUE / COMBO";
        comboDisplay.innerText = `${engine.botAttackQueue} / ${engine.combo > 0 ? engine.combo - 1 : 0}`;
    } else {
        targetLabel.innerText = "COMBO";
        comboDisplay.innerText = engine.combo > 0 ? engine.combo - 1 : 0;
    }

    document.getElementById('b2bDisplay').innerText = engine.b2bCount > 0 ? `x${engine.b2bCount}` : "Off";

    const ppsDisplay = document.getElementById('ppsDisplay');
    if (ppsDisplay) {
        if (engine.currentMode === '40L') {
            const seconds = engine.elapsedTime / 1000;
            const pps = seconds > 0 ? (engine.piecesPlaced / seconds) : 0;
            ppsDisplay.style.display = 'block';
            ppsDisplay.innerText = `PPS: ${pps.toFixed(2)}`;
        } else {
            ppsDisplay.style.display = 'none';
        }
    }

    const spikeDisplay = document.getElementById('spikeDisplay');
    if (spikeDisplay) {
        if (engine.currentSpike >= 10) {
            spikeDisplay.innerHTML = `<span class="spike-active">${engine.currentSpike}D SPIKE!</span>`;
        } else if (engine.currentSpike > 0) {
            spikeDisplay.innerHTML = `<span style="color: #ffaaaa; font-weight: bold;">${engine.currentSpike}D</span>`;
        } else {
            spikeDisplay.innerText = "0D";
        }
    }

    // Bot attack gauge height in survival mode
    const gaugeFill = document.getElementById('attackGauge');
    if (gaugeFill) {
        gaugeFill.style.height = `${(engine.botAttackQueue / 20) * 100}%`;
    }

    // Toggle gauge and apm setting panels depending on mode
    const gaugeArea = document.getElementById('survivalGaugeArea');
    const settingArea = document.getElementById('survivalSettingArea');
    if (gaugeArea) gaugeArea.style.display = (engine.currentMode === 'SURVIVAL') ? 'block' : 'none';
    if (settingArea) settingArea.style.display = (engine.currentMode === 'SURVIVAL') ? 'block' : 'none';
};

engine.onNewBest = (modeName, scoreType, value) => {
    if (modeName === '40L') {
        const localBest = localStorage.getItem('best_record_40l');
        const isNewBest = !localBest || value < parseInt(localBest);
        if (isNewBest) {
            localStorage.setItem('best_record_40l', value);
            triggerPBFlash();
            engine.onAction("🏆 NEW PB!");
        } else {
            engine.onAction("FINISH!");
        }
        saveSessionHistory(value);
    } else if (modeName === 'CHEESE') {
        const localCheese = localStorage.getItem('best_record_cheese');
        const isNewBest = !localCheese || value < parseInt(localCheese);
        if (isNewBest) {
            localStorage.setItem('best_record_cheese', value);
            triggerPBFlash();
            engine.onAction("🏆 NEW PB!");
        } else {
            engine.onAction("CHEESE ALL CLEARED!");
        }
    } else if (modeName === '4W') {
        const localMax4w = parseInt(localStorage.getItem('max_combo_4w') || 0);
        const isNewBest = value > localMax4w;
        if (isNewBest) {
            localStorage.setItem('max_combo_4w', value);
            triggerPBFlash();
            engine.onAction("🏆 NEW MAX COMBO!");
        } else {
            engine.onAction("COMBO BROKEN");
        }
    }
};

// Initial setup
updateSettings();
initKeyBindLabels();

// Game loop
let lastTime = performance.now();

function renderLoop(currentTime) {
    let dt = currentTime - lastTime;
    lastTime = currentTime;
    if (dt > 100) dt = 16.66; 

    // Survival APM update from range slider
    if (engine.currentMode === 'SURVIVAL') {
        const apmInput = document.getElementById('apmInput');
        if (apmInput) {
            engine.targetBotApm = parseInt(apmInput.value) || 70;
        }
    }

    // Fixed timestep execution
    engine.accumulator += dt;
    const FIXED_TICK_MS = 1; 
    while (engine.accumulator >= FIXED_TICK_MS) {
        engine.update(FIXED_TICK_MS);
        engine.accumulator -= FIXED_TICK_MS;
    }

    // Update repeat inputs and DAS/ARR repeats
    inputHandler.update(dt, engine);

    // Update visuals & overlay
    updateKeyOverlay(dt);

    // Render Canvas
    renderer.renderGame(engine);

    requestAnimationFrame(renderLoop);
}

// Launch the loop
requestAnimationFrame(renderLoop);
