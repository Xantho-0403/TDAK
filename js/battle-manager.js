import { safeStorage } from './constants.js';

export class BattleManager {
    constructor(player, bot) {
        this.player = player;
        this.bot = bot;

        // Load scores from safeStorage
        this.playerWins = parseInt(safeStorage.getItem('vs_player_wins') || '0');
        this.botWins = parseInt(safeStorage.getItem('vs_bot_wins') || '0');

        // Queues: Array of { lines: number, hole: number }
        this.playerGarbageQueue = [];
        this.botGarbageQueue = [];

        this.matchInProgress = false;

        this.setupCallbacks();
        this.updateScoreUI();
    }

    setupCallbacks() {
        // Player callbacks
        this.player.onAttackGenerated = (attackPower) => {
            if (this.player.currentMode !== 'VS_BOT') return;
            this.handleAttack(this.player, this.bot, attackPower, this.playerGarbageQueue, this.botGarbageQueue);
        };

        this.player.onGarbageResolve = () => {
            if (this.player.currentMode !== 'VS_BOT') return;
            this.resolveGarbage(this.player, this.playerGarbageQueue);
        };

        this.player.onGameOver = (reason) => {
            if (this.player.currentMode !== 'VS_BOT') return;
            this.handleGameOver(this.bot, this.player, 'BOT', 'PLAYER');
        };

        // Bot callbacks
        this.bot.onAttackGenerated = (attackPower) => {
            if (this.bot.currentMode !== 'VS_BOT') return;
            this.handleAttack(this.bot, this.player, attackPower, this.botGarbageQueue, this.playerGarbageQueue);
        };

        this.bot.onGarbageResolve = () => {
            if (this.bot.currentMode !== 'VS_BOT') return;
            this.resolveGarbage(this.bot, this.botGarbageQueue);
        };

        this.bot.onGameOver = (reason) => {
            if (this.bot.currentMode !== 'VS_BOT') return;
            this.handleGameOver(this.player, this.bot, 'PLAYER', 'BOT');
        };
    }

    handleAttack(attacker, defender, attackPower, attackerQueue, defenderQueue) {
        if (!this.matchInProgress) return;

        let remainingAttack = attackPower;

        // 1. Garbage cancellation (blocking)
        // If there is pending garbage in the attacker's own queue, cancel it first.
        while (remainingAttack > 0 && attackerQueue.length > 0) {
            let firstPacket = attackerQueue[0];
            if (firstPacket.lines > remainingAttack) {
                firstPacket.lines -= remainingAttack;
                remainingAttack = 0;
            } else {
                remainingAttack -= firstPacket.lines;
                attackerQueue.shift();
            }
        }

        // Update attacker's visual damage bar (botAttackQueue represents total queued lines)
        attacker.botAttackQueue = attackerQueue.reduce((sum, p) => sum + p.lines, 0);
        if (attacker.onUIUpdate) attacker.onUIUpdate();

        // 2. Transfer remaining attack to defender's queue
        if (remainingAttack > 0) {
            const hole = Math.floor(Math.random() * 10);
            defenderQueue.push({ lines: remainingAttack, hole: hole });
            
            // Update defender's visual damage bar
            defender.botAttackQueue = defenderQueue.reduce((sum, p) => sum + p.lines, 0);
            if (defender.onUIUpdate) defender.onUIUpdate();
        }
    }

    resolveGarbage(recipient, queue) {
        if (!this.matchInProgress || queue.length === 0) return;

        let spawnAmt = 0;
        let linesToSpawn = []; // Array of hole indices

        // Spawn up to 8 lines at once (standard modern limit/existing Survival mode limit)
        while (spawnAmt < 8 && queue.length > 0) {
            let firstPacket = queue[0];
            let take = Math.min(8 - spawnAmt, firstPacket.lines);
            
            for (let i = 0; i < take; i++) {
                linesToSpawn.push(firstPacket.hole);
            }
            
            spawnAmt += take;
            firstPacket.lines -= take;
            if (firstPacket.lines <= 0) {
                queue.shift();
            }
        }

        // Shift rows up and insert garbage at the bottom
        for (let holeIdx of linesToSpawn) {
            recipient.grid.shift();
            let row = Array(10).fill(8); // 8 is garbage block color
            row[holeIdx] = 0;
            recipient.grid.push(row);
        }

        // Update remaining queued attack count
        recipient.botAttackQueue = queue.reduce((sum, p) => sum + p.lines, 0);
        if (recipient.onUIUpdate) recipient.onUIUpdate();
    }

    handleGameOver(winnerEngine, loserEngine, winnerName, loserName) {
        if (!this.matchInProgress) return;
        this.matchInProgress = false;

        // Set game state inactive for both
        this.player.gameActive = false;
        this.bot.gameActive = false;

        // Stop bot movements
        if (this.bot.onGameOverStop) {
            this.bot.onGameOverStop();
        }

        // Set match outcome
        if (winnerName === 'PLAYER') {
            this.playerWins++;
            safeStorage.setItem('vs_player_wins', this.playerWins.toString());
            this.player.matchResult = 'WIN';
            this.bot.matchResult = 'LOSE';
        } else if (winnerName === 'BOT') {
            this.botWins++;
            safeStorage.setItem('vs_bot_wins', this.botWins.toString());
            this.player.matchResult = 'LOSE';
            this.bot.matchResult = 'WIN';
        }

        this.updateScoreUI();

        if (this.player.onUIUpdate) this.player.onUIUpdate();
        if (this.bot.onUIUpdate) this.bot.onUIUpdate();
    }

    startNewMatch() {
        this.playerGarbageQueue = [];
        this.botGarbageQueue = [];
        this.player.botAttackQueue = 0;
        this.bot.botAttackQueue = 0;
        this.player.matchResult = null;
        this.bot.matchResult = null;
        this.matchInProgress = true;
        this.updateScoreUI();
    }

    resetScore() {
        this.playerWins = 0;
        this.botWins = 0;
        safeStorage.setItem('vs_player_wins', '0');
        safeStorage.setItem('vs_bot_wins', '0');
        this.updateScoreUI();
    }

    updateScoreUI() {
        const playerWinsEl = document.getElementById('playerWinsLabel');
        const botWinsEl = document.getElementById('botWinsLabel');
        if (playerWinsEl) playerWinsEl.innerText = this.playerWins;
        if (botWinsEl) botWinsEl.innerText = this.botWins;
    }
}
