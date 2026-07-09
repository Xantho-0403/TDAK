import { GameInstance } from './game-engine.js';
import { Renderer } from './renderer.js';
import { KeyboardInputProvider, BotInputProvider, PPSScheduler, DebugAI } from './input.js';
import { BattleManager } from './battle-manager.js';

// Global instances
const playerEngine = new GameInstance();
const botEngine = new GameInstance();

// Maintain 'engine' alias for 100% backward compatibility with existing UI and logic
const engine = playerEngine;

const playerRenderer = new Renderer('tetrisCanvas', 'holdCanvas', 'nextCanvas');
const botRenderer = new Renderer('botCanvas', null, null);

// Symmetrical renderers for VS Bot mode
const vsPlayerRenderer = new Renderer('vsPlayerCanvas', 'vsPlayerHoldCanvas', 'vsPlayerNextCanvas');
const vsBotRenderer = new Renderer('vsBotCanvas', 'vsBotHoldCanvas', 'vsBotNextCanvas');

// Maintain 'renderer' alias for backward compatibility with general hooks
const renderer = playerRenderer;

const inputHandler = new KeyboardInputProvider();
inputHandler.attach(playerEngine);

const botInputProvider = new BotInputProvider();
botInputProvider.attach(botEngine);

const botScheduler = new PPSScheduler(botInputProvider);
const botAI = new DebugAI(botEngine, botScheduler);

const battleManager = new BattleManager(playerEngine, botEngine);
botEngine.onGameOverStop = () => {
    botScheduler.clearQueue();
    botAI.lastPiece = null;
};

// Telemetry tracking for the bot's actual Pieces Per Second
class BotTelemetry {
    constructor() {
        this.pieceTimestamps = []; // Array of active game time timestamps (ms) when pieces were placed
        this.lastPiecesPlaced = 0;
    }

    reset() {
        this.pieceTimestamps = [];
        this.lastPiecesPlaced = 0;
    }

    recordPiece(elapsedTime) {
        this.pieceTimestamps.push(elapsedTime);
    }

    getActualPPS(elapsedTime) {
        const cutoff = elapsedTime - 30000;
        this.pieceTimestamps = this.pieceTimestamps.filter(t => t >= cutoff);

        const count = this.pieceTimestamps.length;
        if (count === 0) return 0;

        const firstTime = this.pieceTimestamps[0];
        const activeDurationMs = Math.max(1000, elapsedTime - firstTime);
        const activeDurationSec = activeDurationMs / 1000;

        return count / activeDurationSec;
    }
}

const botTelemetry = new BotTelemetry();
let botPlayTime = 0;
let lastDiagnosticTime = 0;

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

function toggleLayout(modeName) {
    const sidebarLeft = document.querySelector('.sidebar-left');
    const soloBoardWrapper = document.getElementById('soloBoardWrapper');
    const sidebarRight = document.querySelector('.sidebar-right');
    const vsBotLayout = document.getElementById('vsBotLayout');

    if (modeName === 'VS_BOT') {
        if (sidebarLeft) sidebarLeft.style.display = 'none';
        if (soloBoardWrapper) soloBoardWrapper.style.display = 'none';
        if (sidebarRight) sidebarRight.style.display = 'none';
        if (vsBotLayout) vsBotLayout.style.display = 'flex';
    } else {
        if (sidebarLeft) sidebarLeft.style.display = 'flex';
        if (soloBoardWrapper) soloBoardWrapper.style.display = 'flex';
        if (sidebarRight) sidebarRight.style.display = 'flex';
        if (vsBotLayout) vsBotLayout.style.display = 'none';
    }
}

function selectMode(modeName) {
    playerEngine.currentMode = modeName;
    botEngine.currentMode = modeName;
    toggleLayout(modeName);
    closeModal();
    playerEngine.reset();
    botEngine.reset();
    botScheduler.clearQueue();
    botAI.lastPiece = null;
    botTelemetry.reset();
    botPlayTime = 0;
    lastDiagnosticTime = 0;
    if (modeName === 'VS_BOT') {
        battleManager.startNewMatch();
    }
}

// Global hook for inline HTML onclick attributes
window.game = {
    openModal,
    closeModal,
    selectMode,
    reset: () => {
        playerEngine.reset();
        botEngine.reset();
        botScheduler.clearQueue();
        botAI.lastPiece = null;
        botTelemetry.reset();
        botPlayTime = 0;
        lastDiagnosticTime = 0;
        if (playerEngine.currentMode === 'VS_BOT') {
            battleManager.startNewMatch();
        }
    },
    startRebind: (action) => inputHandler.startRebind(action)
};

// UI settings synchronizer
function updateSettings() {
    const das = parseInt(document.getElementById('dasInput').value) || 0;
    const arr = parseInt(document.getElementById('arrInput').value) || 0;
    const sdf = parseInt(document.getElementById('sdfInput').value) || 1;
    
    const delayInput = document.getElementById('clearDelayInput');
    const clearDelay = delayInput ? (parseInt(delayInput.value) || 0) : 0;
    
    playerEngine.lineClearDelay = clearDelay;
    playerEngine.sdf = sdf;
    botEngine.lineClearDelay = clearDelay;
    botEngine.sdf = sdf;

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

const sidebarPpsEl = document.getElementById('botPpsInput');
const vsPpsEl = document.getElementById('vsBotPpsInput');
const vsLabelEl = document.getElementById('vsBotPpsLabel');

function syncBotPps(val) {
    let num = parseFloat(val) || 3.0;
    num = Math.max(0.5, Math.min(15.0, num));
    
    if (sidebarPpsEl && parseFloat(sidebarPpsEl.value) !== num) {
        sidebarPpsEl.value = num.toFixed(1);
    }
    if (vsPpsEl && parseFloat(vsPpsEl.value) !== num) {
        vsPpsEl.value = num;
    }
    if (vsLabelEl) {
        vsLabelEl.innerText = num.toFixed(1);
    }
    
    if (botScheduler) {
        botScheduler.setPPS(num);
    }
}

if (sidebarPpsEl) {
    sidebarPpsEl.addEventListener('input', (e) => {
        syncBotPps(e.target.value);
    });
}
if (vsPpsEl) {
    vsPpsEl.addEventListener('input', (e) => {
        syncBotPps(e.target.value);
    });
}

// Register skin changes
const skinSelect = document.getElementById('skinSelect');
if (skinSelect) {
    skinSelect.value = playerRenderer.currentSkin;
    skinSelect.addEventListener('change', () => {
        const selectedSkin = skinSelect.value;
        playerRenderer.currentSkin = selectedSkin;
        botRenderer.currentSkin = selectedSkin;
        vsPlayerRenderer.currentSkin = selectedSkin;
        vsBotRenderer.currentSkin = selectedSkin;
        localStorage.setItem('tetris_skin', selectedSkin);
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
            playerEngine.reset();
            botEngine.reset();
            botScheduler.clearQueue();
            botAI.lastPiece = null;
            botTelemetry.reset();
            botPlayTime = 0;
            lastDiagnosticTime = 0;
            if (playerEngine.currentMode === 'VS_BOT') {
                battleManager.startNewMatch();
            }
            return;
        }
    }
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code) || inputHandler.rebindTarget) {
        e.preventDefault();
    }
    inputHandler.handleKeyDown(e.code);
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
        if (el) el.classList.toggle('active', active);
        const elVs = document.getElementById('vs-' + id);
        if (elVs) elVs.classList.toggle('active', active);
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
playerEngine.onAction = (text) => {
    if (playerEngine.currentMode !== 'VS_BOT') {
        const display = document.getElementById('actionDisplay');
        if (display) display.innerText = text;
    }
};

playerEngine.onUIUpdate = () => {
    if (playerEngine.currentMode === 'VS_BOT') {
        const timerDisplay = document.getElementById('vsTimerDisplay');
        if (timerDisplay) {
            timerDisplay.innerText = formatTime(playerEngine.elapsedTime);
        }
        
        const comboVal = document.getElementById('vsPlayerCombo');
        if (comboVal) {
            comboVal.innerText = playerEngine.combo > 0 ? playerEngine.combo - 1 : 0;
        }
        
        const b2bVal = document.getElementById('vsPlayerB2B');
        if (b2bVal) {
            b2bVal.innerText = playerEngine.b2bCount > 0 ? `x${playerEngine.b2bCount}` : "Off";
        }
        
        const attackVal = document.getElementById('vsPlayerAttack');
        if (attackVal) {
            attackVal.innerText = playerEngine.totalAttackSent;
        }

        const damageBar = document.getElementById('vsPlayerDamageBar');
        if (damageBar) {
            const pct = Math.min(100, (playerEngine.botAttackQueue / 20) * 100);
            damageBar.style.height = `${pct}%`;
        }
    } else {
        document.getElementById('modeDisplay').innerText = playerEngine.currentMode;
        document.getElementById('timerDisplay').innerText = formatTime(playerEngine.elapsedTime);

        const targetLabel = document.getElementById('targetLabel');
        const comboDisplay = document.getElementById('comboDisplay');

        if (playerEngine.currentMode === '40L') {
            targetLabel.innerText = "LINE LEFT";
            comboDisplay.innerText = Math.max(0, 40 - playerEngine.linesClearedTotal);
        } else if (playerEngine.currentMode === 'CHEESE') {
            targetLabel.innerText = "CHEESE LEFT";
            comboDisplay.innerText = playerEngine.cheeseLinesRemaining;
        } else if (playerEngine.currentMode === 'SURVIVAL') {
            targetLabel.innerText = "QUEUE / COMBO";
            comboDisplay.innerText = `${playerEngine.botAttackQueue} / ${playerEngine.combo > 0 ? playerEngine.combo - 1 : 0}`;
        } else {
            targetLabel.innerText = "COMBO";
            comboDisplay.innerText = playerEngine.combo > 0 ? playerEngine.combo - 1 : 0;
        }

        document.getElementById('b2bDisplay').innerText = playerEngine.b2bCount > 0 ? `x${playerEngine.b2bCount}` : "Off";

        const ppsDisplay = document.getElementById('ppsDisplay');
        if (ppsDisplay) {
            if (playerEngine.currentMode === '40L') {
                const seconds = playerEngine.elapsedTime / 1000;
                const pps = seconds > 0 ? (playerEngine.piecesPlaced / seconds) : 0;
                ppsDisplay.style.display = 'block';
                ppsDisplay.innerText = `PPS: ${pps.toFixed(2)}`;
            } else {
                ppsDisplay.style.display = 'none';
            }
        }

        const spikeDisplay = document.getElementById('spikeDisplay');
        if (spikeDisplay) {
            if (playerEngine.currentSpike >= 10) {
                spikeDisplay.innerHTML = `<span class="spike-active">${playerEngine.currentSpike}D SPIKE!</span>`;
            } else if (playerEngine.currentSpike > 0) {
                spikeDisplay.innerHTML = `<span style="color: #ffaaaa; font-weight: bold;">${playerEngine.currentSpike}D</span>`;
            } else {
                spikeDisplay.innerText = "0D";
            }
        }

        // Bot attack gauge height in survival mode
        const gaugeFill = document.getElementById('attackGauge');
        if (gaugeFill) {
            gaugeFill.style.height = `${(playerEngine.botAttackQueue / 20) * 100}%`;
        }

        // Toggle gauge, apm setting, and bot board column depending on mode
        const gaugeArea = document.getElementById('survivalGaugeArea');
        const settingArea = document.getElementById('survivalSettingArea');
        if (gaugeArea) gaugeArea.style.display = (playerEngine.currentMode === 'SURVIVAL') ? 'block' : 'none';
        if (settingArea) settingArea.style.display = (playerEngine.currentMode === 'SURVIVAL') ? 'block' : 'none';
    }
};

botEngine.onAction = (text) => {};

botEngine.onUIUpdate = () => {
    if (botEngine.currentMode === 'VS_BOT') {
        const comboVal = document.getElementById('vsBotCombo');
        if (comboVal) {
            comboVal.innerText = botEngine.combo > 0 ? botEngine.combo - 1 : 0;
        }
        
        const b2bVal = document.getElementById('vsBotB2B');
        if (b2bVal) {
            b2bVal.innerText = botEngine.b2bCount > 0 ? `x${botEngine.b2bCount}` : "Off";
        }
        
        const attackVal = document.getElementById('vsBotAttack');
        if (attackVal) {
            attackVal.innerText = botEngine.totalAttackSent;
        }

        const damageBar = document.getElementById('vsBotDamageBar');
        if (damageBar) {
            const pct = Math.min(100, (botEngine.botAttackQueue / 20) * 100);
            damageBar.style.height = `${pct}%`;
        }
    }
};

playerEngine.onNewBest = (modeName, scoreType, value) => {
    if (modeName === 'VS_BOT') return;
    if (modeName === '40L') {
        const localBest = localStorage.getItem('best_record_40l');
        const isNewBest = !localBest || value < parseInt(localBest);
        if (isNewBest) {
            localStorage.setItem('best_record_40l', value);
            triggerPBFlash();
            playerEngine.onAction("🏆 NEW PB!");
        } else {
            playerEngine.onAction("FINISH!");
        }
        saveSessionHistory(value);
    } else if (modeName === 'CHEESE') {
        const localCheese = localStorage.getItem('best_record_cheese');
        const isNewBest = !localCheese || value < parseInt(localCheese);
        if (isNewBest) {
            localStorage.setItem('best_record_cheese', value);
            triggerPBFlash();
            playerEngine.onAction("🏆 NEW PB!");
        } else {
            playerEngine.onAction("CHEESE ALL CLEARED!");
        }
    } else if (modeName === '4W') {
        const localMax4w = parseInt(localStorage.getItem('max_combo_4w') || 0);
        const isNewBest = value > localMax4w;
        if (isNewBest) {
            localStorage.setItem('max_combo_4w', value);
            triggerPBFlash();
            playerEngine.onAction("🏆 NEW MAX COMBO!");
        } else {
            playerEngine.onAction("COMBO BROKEN");
        }
    }
};

// Initial setup
updateSettings();
initKeyBindLabels();
toggleLayout(playerEngine.currentMode);

// Sync bot PPS settings on startup
syncBotPps(3.0);

// Game loop
let lastTime = performance.now();

function renderLoop(currentTime) {
    let dt = currentTime - lastTime;
    lastTime = currentTime;
    if (dt > 100) dt = 16.66; 

    // Survival APM update from range slider
    if (playerEngine.currentMode === 'SURVIVAL') {
        const apmInput = document.getElementById('apmInput');
        if (apmInput) {
            playerEngine.targetBotApm = parseInt(apmInput.value) || 70;
            botEngine.targetBotApm = parseInt(apmInput.value) || 70;
        }
    }

    // Fixed timestep execution for Player
    playerEngine.accumulator += dt;
    const FIXED_TICK_MS = 1; 
    while (playerEngine.accumulator >= FIXED_TICK_MS) {
        playerEngine.update(FIXED_TICK_MS);
        playerEngine.accumulator -= FIXED_TICK_MS;
    }

    // Fixed timestep execution for Bot (runs in all modes in Phase 3)
    botEngine.accumulator += dt;
    while (botEngine.accumulator >= FIXED_TICK_MS) {
        botEngine.update(FIXED_TICK_MS);
        botEngine.accumulator -= FIXED_TICK_MS;
    }

    // Update Bot AI (updates PPS Scheduler and schedules movements)
    if (playerEngine.currentMode === 'VS_BOT') {
        botAI.update(dt);

        // Record pieces and update telemetry
        if (botEngine.gameActive && !botEngine.countdownActive) {
            if (botEngine.piecesPlaced > botTelemetry.lastPiecesPlaced) {
                const numPlaced = botEngine.piecesPlaced - botTelemetry.lastPiecesPlaced;
                for (let i = 0; i < numPlaced; i++) {
                    botTelemetry.recordPiece(botEngine.elapsedTime);
                }
                botTelemetry.lastPiecesPlaced = botEngine.piecesPlaced;
            }

            const actualPps = botTelemetry.getActualPPS(botEngine.elapsedTime);
            const actualPpsEl = document.getElementById('actualPpsLabel');
            const targetPpsEl = document.getElementById('targetPpsLabel');
            if (actualPpsEl) {
                actualPpsEl.innerText = actualPps.toFixed(2);
            }
            if (targetPpsEl) {
                targetPpsEl.innerText = botScheduler.pps.toFixed(1);
            }

            // Periodic 30s diagnostics log and accuracy compare
            botPlayTime += dt;
            if (botPlayTime - lastDiagnosticTime >= 30000) {
                const targetPps = botScheduler.pps;
                const diffPct = Math.abs(actualPps - targetPps) / targetPps * 100;
                console.log(`[BOT TELEMETRY] 30s Window. Target: ${targetPps.toFixed(1)} PPS, Actual: ${actualPps.toFixed(2)} PPS (Discrepancy: ${diffPct.toFixed(1)}%)`);
                if (diffPct > 5) {
                    console.warn(`[BOT TELEMETRY WARNING] Discrepancy exceeds 5%! Target: ${targetPps.toFixed(1)}, Measured: ${actualPps.toFixed(2)} (Diff: ${diffPct.toFixed(1)}%). Source of discrepancy: Frame scheduling jitter or browser/CPU lag.`);
                }
                lastDiagnosticTime = botPlayTime;
            }
        }
    }

    // Update repeat inputs and DAS/ARR repeats
    inputHandler.update(dt);

    // Update visuals & overlay
    updateKeyOverlay(dt);

    // Render Canvases
    const debugCheckbox = document.getElementById('aiDebugOverlayCheckbox');
    const showOverlay = debugCheckbox ? debugCheckbox.checked : false;
    if (botEngine.aiDebugData) {
        botEngine.aiDebugData.show = showOverlay;
    }

    if (playerEngine.currentMode === 'VS_BOT') {
        vsPlayerRenderer.renderGame(playerEngine);
        vsBotRenderer.renderGame(botEngine);
    } else {
        playerRenderer.renderGame(playerEngine);
        if (playerEngine.currentMode === 'SURVIVAL') {
            botRenderer.renderGame(botEngine);
        }
    }

    requestAnimationFrame(renderLoop);
}

// Launch the loop
requestAnimationFrame(renderLoop);
