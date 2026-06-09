/**
 * game-core.js — Snake3D 游戏核心逻辑（支持单/双人模式）
 *
 * [成员D — 游戏核心逻辑]
 * 纯逻辑模块，不依赖 Three.js。
 *
 * 单人模式：
 *   - 18x18 网格，蛇初始 3 节，吃食物 +10 分
 *   - 撞墙或撞自己 → 游戏结束
 *
 * 双人模式（对抗）：
 *   - P1: WASD 绿色蛇，P2: 方向键 蓝色蛇
 *   - 共享食物池，撞任何蛇身或墙 → 死亡
 *   - 最先淘汰者输，最后存活者获胜
 *   - 同时死亡 → 平局
 */

var GameEngine = (function () {
    'use strict';

    var GRID_SIZE = 18;
    var INITIAL_SPEED = 180;
    var MIN_SPEED = 60;
    var SPEED_STEP = 10;
    var FOOD_PER_SPEEDUP = 5;
    var SCORE_PER_FOOD = 10;

    var STATE = { IDLE: 'idle', PLAYING: 'playing', PAUSED: 'paused', OVER: 'over' };
    var MODE = { SINGLE: 'single', TWO_PLAYER: 'twoPlayer' };

    var DIR = {
        UP:    { x:  0, z: -1 },
        DOWN:  { x:  0, z:  1 },
        LEFT:  { x: -1, z:  0 },
        RIGHT: { x:  1, z:  0 }
    };

    // === 游戏模式 ===
    var mode = MODE.SINGLE;

    // === 玩家1 状态 ===
    var snake1 = [];
    var direction1 = null;
    var nextDirection1 = null;
    var score1 = 0;
    var alive1 = true;

    // === 玩家2 状态（双人模式） ===
    var snake2 = [];
    var direction2 = null;
    var nextDirection2 = null;
    var score2 = 0;
    var alive2 = true;

    var food = null;
    var speed = INITIAL_SPEED;
    var state = STATE.IDLE;
    var winner = null; // 1=玩家1胜, 2=玩家2胜, 0=平局

    var callbacks = {
        onUpdate: null,
        onScoreChange: null,
        onGameOver: null,
        onEatFood: null,
        onStateChange: null,
        onSnakeDie: null
    };

    // === API ===
    function getGridSize() { return GRID_SIZE; }
    function getSnake() { return snake1.slice(); }
    function getSnake2() { return snake2.slice(); }
    function getFood() { return food ? { x: food.x, z: food.z } : null; }
    function getScore() { return score1; }
    function getScore2() { return score2; }
    function getSpeed() { return speed; }
    function getState() { return state; }
    function getMode() { return mode; }
    function getWinner() { return winner; }
    function isAlive1() { return alive1; }
    function isAlive2() { return alive2; }

    function on(event, callback) { callbacks[event] = callback; }

    function setMode(m) { mode = m; }

    function init() {
        var center = Math.floor(GRID_SIZE / 2);
        // 玩家1：中间偏左
        snake1 = [
            { x: center - 1, z: center },
            { x: center - 2, z: center },
            { x: center - 3, z: center }
        ];
        direction1 = DIR.RIGHT;
        nextDirection1 = DIR.RIGHT;
        score1 = 0;
        alive1 = true;

        // 玩家2：中间偏右，方向向左
        snake2 = [
            { x: center + 1, z: center },
            { x: center + 2, z: center },
            { x: center + 3, z: center }
        ];
        direction2 = DIR.LEFT;
        nextDirection2 = DIR.LEFT;
        score2 = 0;
        alive2 = true;

        winner = null;
        speed = INITIAL_SPEED;
        state = STATE.IDLE;
        placeFood();
        fire('onUpdate', getPublicState());
        fire('onStateChange', state);
    }

    function start() {
        if (state === STATE.OVER || state === STATE.IDLE) {
            init();
        }
        state = STATE.PLAYING;
        fire('onStateChange', state);
        fire('onUpdate', getPublicState());
    }

    function togglePause() {
        if (state === STATE.PLAYING) state = STATE.PAUSED;
        else if (state === STATE.PAUSED) state = STATE.PLAYING;
        fire('onStateChange', state);
    }

    function restart() { init(); start(); }

    function setDirection(dir) { setDirectionFor(dir, 1); }
    function setDirectionP2(dir) { setDirectionFor(dir, 2); }

    function setDirectionFor(dir, player) {
        if (state !== STATE.PLAYING) return;
        if (!dir || (dir.x === 0 && dir.z === 0)) return;
        if (player === 1 && !alive1) return;
        if (player === 2 && !alive2) return;

        var curDir = player === 1 ? direction1 : direction2;
        if (curDir && dir.x === -curDir.x && dir.z === -curDir.z) return;

        if (player === 1) nextDirection1 = dir;
        else nextDirection2 = dir;
    }

    function tick() {
        if (state !== STATE.PLAYING) return true;

        // 应用缓冲方向
        if (nextDirection1) direction1 = nextDirection1;
        if (nextDirection2) direction2 = nextDirection2;

        // === 移动玩家1 ===
        if (alive1) {
            moveSnake(1, snake1, direction1, nextDirection1);
        }

        // === 移动玩家2 ===
        if (mode === MODE.TWO_PLAYER && alive2) {
            moveSnake(2, snake2, direction2, nextDirection2);
        }

        // === 检查对战结束 ===
        if (mode === MODE.TWO_PLAYER) {
            if (!alive1 && !alive2) {
                winner = 0; // 平局
                endGame();
                return false;
            } else if (!alive1 && alive2) {
                winner = 2;
                endGame();
                return false;
            } else if (alive1 && !alive2) {
                winner = 1;
                endGame();
                return false;
            }
        }

        fire('onUpdate', getPublicState());
        return state !== STATE.OVER;
    }

    function moveSnake(playerNum, snakeArr, dir, nextDir) {
        if (nextDir) dir = nextDir;
        var head = snakeArr[0];
        var newHead = { x: head.x + dir.x, z: head.z + dir.z };

        // 撞墙
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.z < 0 || newHead.z >= GRID_SIZE) {
            killPlayer(playerNum);
            return;
        }

        // 撞自己
        for (var i = 0; i < snakeArr.length - 1; i++) {
            if (snakeArr[i].x === newHead.x && snakeArr[i].z === newHead.z) {
                killPlayer(playerNum);
                return;
            }
        }

        // 撞对方蛇（双人模式）
        if (mode === MODE.TWO_PLAYER) {
            var otherSnake = playerNum === 1 ? snake2 : snake1;
            for (var j = 0; j < otherSnake.length; j++) {
                if (otherSnake[j].x === newHead.x && otherSnake[j].z === newHead.z) {
                    killPlayer(playerNum);
                    return;
                }
            }
        }

        // 移动
        snakeArr.unshift(newHead);

        // 吃食物
        if (food && newHead.x === food.x && newHead.z === food.z) {
            if (playerNum === 1) {
                score1 += SCORE_PER_FOOD;
                fire('onScoreChange', { player: 1, score: score1 });
            } else {
                score2 += SCORE_PER_FOOD;
                fire('onScoreChange', { player: 2, score: score2 });
            }
            fire('onEatFood', food);

            var foodEaten = Math.floor((score1 + score2) / SCORE_PER_FOOD);
            if (foodEaten > 0 && foodEaten % FOOD_PER_SPEEDUP === 0) {
                speed = Math.max(MIN_SPEED, INITIAL_SPEED - Math.floor(foodEaten / FOOD_PER_SPEEDUP) * SPEED_STEP);
            }
            placeFood();
        } else {
            snakeArr.pop();
        }
    }

    function killPlayer(playerNum) {
        if (playerNum === 1) {
            alive1 = false;
            snake1 = [];
        } else {
            alive2 = false;
            snake2 = [];
        }
        fire('onSnakeDie', playerNum);
        // 单人模式：立即结束游戏
        if (mode === MODE.SINGLE) {
            endGame();
        }
    }

    function placeFood() {
        var occupied = {};
        snake1.forEach(function(s) { occupied[s.x + ',' + s.z] = true; });
        snake2.forEach(function(s) { occupied[s.x + ',' + s.z] = true; });

        if (Object.keys(occupied).length >= GRID_SIZE * GRID_SIZE) { food = null; return; }

        for (var tries = 0; tries < 200; tries++) {
            var x = Math.floor(Math.random() * GRID_SIZE);
            var z = Math.floor(Math.random() * GRID_SIZE);
            if (!occupied[x + ',' + z]) { food = { x: x, z: z }; return; }
        }
        food = null;
    }

    function endGame() {
        state = STATE.OVER;
        fire('onGameOver', mode === MODE.TWO_PLAYER ? { winner: winner } : score1);
        fire('onStateChange', state);
    }

    function fire(name, data) {
        if (callbacks[name]) {
            try { callbacks[name](data); } catch (e) { console.error('GameEngine callback error:', e); }
        }
    }

    function getPublicState() {
        var s = {
            snake: snake1.slice(),
            snake2: snake2.slice(),
            food: food ? { x: food.x, z: food.z } : null,
            score: score1,
            score2: score2,
            speed: speed,
            state: state,
            mode: mode,
            winner: winner,
            alive1: alive1,
            alive2: alive2,
            gridSize: GRID_SIZE
        };
        return s;
    }

    init();

    return {
        init: init, start: start, togglePause: togglePause, restart: restart,
        tick: tick, setDirection: setDirection, setDirectionP2: setDirectionP2,
        setMode: setMode, getMode: getMode, getWinner: getWinner,
        getGridSize: getGridSize, getSnake: getSnake, getSnake2: getSnake2,
        getFood: getFood, getScore: getScore, getScore2: getScore2,
        getSpeed: getSpeed, getState: getState,
        isAlive1: isAlive1, isAlive2: isAlive2,
        on: on, STATE: STATE, MODE: MODE, DIR: DIR
    };
})();
