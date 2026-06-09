/**
 * game-core.js — Snake3D 游戏核心逻辑（支持单/双人、地图、道具）
 *
 * [成员A — 游戏核心逻辑]
 * 功能：地图大小选择、场景主题、道具系统、障碍物
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
    var THEME = { DARK: 'dark', GREEN: 'green', DESERT: 'desert', ICE: 'ice' };
    var DIFFICULTY = { EASY: 'easy', NORMAL: 'normal', HARD: 'hard' };
    var ITEM_TYPE = { SPEED: 'speed', SLOW: 'slow', SHIELD: 'shield', DOUBLE: 'double', GHOST: 'ghost' };

    var DIR = {
        UP:    { x:  0, z: -1 },
        DOWN:  { x:  0, z:  1 },
        LEFT:  { x: -1, z:  0 },
        RIGHT: { x:  1, z:  0 }
    };

    var mode = MODE.SINGLE;
    var theme = THEME.DARK;
    var difficulty = DIFFICULTY.NORMAL;

    // 玩家状态
    var snake1 = [], direction1 = null, nextDirection1 = null, score1 = 0, alive1 = true;
    var shield1 = false, doubleScore1 = false;
    var snake2 = [], direction2 = null, nextDirection2 = null, score2 = 0, alive2 = true;
    var shield2 = false, doubleScore2 = false;

    var food = null;
    var speed = INITIAL_SPEED;
    var state = STATE.IDLE;
    var winner = null;

    // 道具
    var items = [];       // [{x, z, type}]
    var itemTimer = 0;    // tick counter for item spawning
    var ITEM_SPAWN_INTERVAL = 10; // 道具生成间隔（平衡食物频率）
    var ITEM_MAX = 1;

    // 连击系统
    var combo = 0;
    var lastEatTime = 0;
    var COMBO_TIMEOUT = 2500;

    // 幽灵模式
    var ghostMode1 = false, ghostTimer1 = 0;
    var ghostMode2 = false, ghostTimer2 = 0;
    var GHOST_DURATION = 30; // 幽灵持续30步

    // 传送门
    var portalA = null, portalB = null;
    var portalCooldown = 0; // 传送后冷却3步

    // 障碍物
    var obstacles = [];   // [{x, z}]
    var obstacleCount = 0;

    var callbacks = {
        onUpdate: null, onScoreChange: null, onGameOver: null,
        onEatFood: null, onStateChange: null, onSnakeDie: null,
        onEatItem: null
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
    function getTheme() { return theme; }
    function getWinner() { return winner; }
    function isAlive1() { return alive1; }
    function isAlive2() { return alive2; }
    function hasShield1() { return shield1; }
    function hasShield2() { return shield2; }
    function getItems() { return items.slice(); }
    function getObstacles() { return obstacles.slice(); }
    function on(event, callback) { callbacks[event] = callback; }

    function setMode(m) { mode = m; }
    function setTheme(t) { theme = t; }
    function setDifficulty(d) { difficulty = d; }
    function getDifficulty() { return difficulty; }

    function setGridSize(size) {
        size = parseInt(size, 10) || 18;
        if (size < 10) size = 10;
        if (size > 30) size = 30;
        GRID_SIZE = size;
        // 障碍物数量：难度越低越少
        if (difficulty === DIFFICULTY.EASY) {
            obstacleCount = size <= 12 ? 2 : (size <= 18 ? 4 : 6);
        } else if (difficulty === DIFFICULTY.HARD) {
            obstacleCount = size <= 12 ? 10 : (size <= 18 ? 16 : 24);
        } else {
            obstacleCount = size <= 12 ? 6 : (size <= 18 ? 10 : 16);
        }
        init();
    }

    function init() {
        var center = Math.floor(GRID_SIZE / 2);

        if (mode === MODE.TWO_PLAYER) {
            var offset = Math.max(2, Math.floor(GRID_SIZE / 9));
            snake1 = [
                { x: center - offset, z: center },
                { x: center - offset, z: center + 1 },
                { x: center - offset, z: center + 2 }
            ];
            direction1 = DIR.UP; nextDirection1 = DIR.UP;
            snake2 = [
                { x: center + offset, z: center },
                { x: center + offset, z: center + 1 },
                { x: center + offset, z: center + 2 }
            ];
            direction2 = DIR.UP; nextDirection2 = DIR.UP;
        } else {
            snake1 = [
                { x: center - 1, z: center },
                { x: center - 2, z: center },
                { x: center - 3, z: center }
            ];
            direction1 = DIR.RIGHT; nextDirection1 = DIR.RIGHT;
            snake2 = [];
            direction2 = DIR.RIGHT; nextDirection2 = DIR.RIGHT;
        }

        score1 = 0; alive1 = true; shield1 = false; doubleScore1 = false;
        combo = 0; lastEatTime = 0;
        score2 = 0; alive2 = true; shield2 = false; doubleScore2 = false;
        winner = null;
        // 难度影响速度: EASY=220, NORMAL=180, HARD=140
        speed = difficulty === DIFFICULTY.EASY ? 220 : (difficulty === DIFFICULTY.HARD ? 140 : INITIAL_SPEED);
        state = STATE.IDLE;
        items = []; itemTimer = 0;
        obstacles = [];
        placeObstacles();
        placePortals();
        placeFood();
        fire('onUpdate', getPublicState());
        fire('onStateChange', state);
    }

    function start() {
        if (state === STATE.OVER || state === STATE.IDLE) init();
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

    function setDirection(dir) { return setDirectionFor(dir, 1); }
    function setDirectionP2(dir) { return setDirectionFor(dir, 2); }

    function setDirectionFor(dir, player) {
        if (state !== STATE.PLAYING) return false;
        if (!dir || (dir.x === 0 && dir.z === 0)) return false;
        if (player === 1 && !alive1) return false;
        if (player === 2 && !alive2) return false;
        var curDir = player === 1 ? direction1 : direction2;
        if (curDir && dir.x === -curDir.x && dir.z === -curDir.z) return false;
        if (player === 1) nextDirection1 = dir;
        else nextDirection2 = dir;
        return true;
    }

    // 道具描述映射
    function getItemDesc(type) {
        var map = {};
        map[ITEM_TYPE.SPEED] = '闪电: 加速!';
        map[ITEM_TYPE.SLOW] = '龟壳: 减速!';
        map[ITEM_TYPE.SHIELD] = '护盾: 抵消一次死亡';
        map[ITEM_TYPE.DOUBLE] = '双倍: 得分×2';
        map[ITEM_TYPE.GHOST] = '幽灵: 穿透!';
        return map[type] || type;
    }

    function tick() {
        if (state !== STATE.PLAYING) return true;

        if (nextDirection1) direction1 = nextDirection1;
        if (nextDirection2) direction2 = nextDirection2;

        var newHead1 = null, newHead2 = null;
        if (alive1) newHead1 = { x: snake1[0].x + direction1.x, z: snake1[0].z + direction1.z };
        if (mode === MODE.TWO_PLAYER && alive2) newHead2 = { x: snake2[0].x + direction2.x, z: snake2[0].z + direction2.z };

        if (mode === MODE.TWO_PLAYER && newHead1 && newHead2 &&
            newHead1.x === newHead2.x && newHead1.z === newHead2.z) {
            killPlayer(1); killPlayer(2); endGame(); winner = 0; return false;
        }

        if (alive1 && newHead1) moveSnakeWithHead(1, snake1, newHead1);
        if (mode === MODE.TWO_PLAYER && alive2 && newHead2) moveSnakeWithHead(2, snake2, newHead2);

        if (mode === MODE.TWO_PLAYER) {
            if (!alive1 && !alive2) { winner = 0; endGame(); return false; }
            else if (!alive1 && alive2) { winner = 2; endGame(); return false; }
            else if (alive1 && !alive2) { winner = 1; endGame(); return false; }
        }

        // 道具生成计时
        itemTimer++;
        if (itemTimer >= ITEM_SPAWN_INTERVAL && items.length < ITEM_MAX && state === STATE.PLAYING) {
            placeItem();
            itemTimer = 0;
        }

        if (ghostMode1) { ghostTimer1--; if (ghostTimer1 <= 0) ghostMode1 = false; }
        if (ghostMode2) { ghostTimer2--; if (ghostTimer2 <= 0) ghostMode2 = false; }
        if (portalCooldown > 0) portalCooldown--;

        fire('onUpdate', getPublicState());
        return state !== STATE.OVER;
    }

    function moveSnakeWithHead(playerNum, snakeArr, newHead) {
        var isGhost = (playerNum === 1 && ghostMode1) || (playerNum === 2 && ghostMode2);
        if (!isGhost) {
        // 撞墙
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.z < 0 || newHead.z >= GRID_SIZE) {
            if (playerNum === 1 && shield1) { useShield(playerNum); return; }
            if (playerNum === 2 && shield2) { useShield(playerNum); return; }
            killPlayer(playerNum); return;
        }
        // 撞自己
        for (var i = 0; i < snakeArr.length - 1; i++) {
            if (snakeArr[i].x === newHead.x && snakeArr[i].z === newHead.z) {
                if (playerNum === 1 && shield1) { useShield(playerNum); return; }
                if (playerNum === 2 && shield2) { useShield(playerNum); return; }
                killPlayer(playerNum); return;
            }
        }
        // 撞障碍物
        for (var o = 0; o < obstacles.length; o++) {
            if (obstacles[o].x === newHead.x && obstacles[o].z === newHead.z) {
                if (playerNum === 1 && shield1) { useShield(playerNum); return; }
                if (playerNum === 2 && shield2) { useShield(playerNum); return; }
                killPlayer(playerNum); return;
            }
        }
        // 撞对方蛇身
        if (mode === MODE.TWO_PLAYER) {
            var otherSnake = playerNum === 1 ? snake2 : snake1;
            var otherAlive = playerNum === 1 ? alive2 : alive1;
            var startIdx = otherAlive ? 1 : 0;
            for (var j = startIdx; j < otherSnake.length; j++) {
                if (otherSnake[j].x === newHead.x && otherSnake[j].z === newHead.z) {
                    if (playerNum === 1 && shield1) { useShield(playerNum); return; }
                    if (playerNum === 2 && shield2) { useShield(playerNum); return; }
                    killPlayer(playerNum); return;
                }
            }
        }
        }

        if (portalA && portalB && portalCooldown <= 0) {
            if (newHead.x === portalA.x && newHead.z === portalA.z) {
                newHead = { x: portalB.x, z: portalB.z }; portalCooldown = 3;
            } else if (newHead.x === portalB.x && newHead.z === portalB.z) {
                newHead = { x: portalA.x, z: portalA.z }; portalCooldown = 3;
            }
        }

        snakeArr.unshift(newHead);

        // 吃食物
        if (food && newHead.x === food.x && newHead.z === food.z) {
            var pts = SCORE_PER_FOOD;
            if (playerNum === 1 && doubleScore1) pts *= 2;
            if (playerNum === 2 && doubleScore2) pts *= 2;
            // 连击倍率
            var now = Date.now();
            if (now - lastEatTime < COMBO_TIMEOUT) {
                combo++;
            } else {
                combo = 0;
            }
            lastEatTime = now;
            if (combo >= 1) pts = Math.floor(pts * (1 + combo * 0.5));
            if (playerNum === 1) { score1 += pts; fire('onScoreChange', { player: 1, score: score1, combo: combo }); }
            else { score2 += pts; fire('onScoreChange', { player: 2, score: score2, combo: combo }); }
            fire('onEatFood', food);
            var totalFood = Math.floor((score1 + score2) / SCORE_PER_FOOD);
            if (totalFood > 0 && totalFood % FOOD_PER_SPEEDUP === 0) {
                speed = Math.max(MIN_SPEED, INITIAL_SPEED - Math.floor(totalFood / FOOD_PER_SPEEDUP) * SPEED_STEP);
            }
            placeFood();
            return;
        }

        // 吃道具
        for (var k = 0; k < items.length; k++) {
            if (items[k].x === newHead.x && items[k].z === newHead.z) {
                applyItem(playerNum, items[k].type);
                fire('onEatItem', { player: playerNum, type: items[k].type, pos: items[k] });
                items.splice(k, 1);
                return;
            }
        }

        snakeArr.pop();
    }

    function applyItem(playerNum, itemType) {
        switch (itemType) {
            case ITEM_TYPE.SPEED:
                speed = Math.max(MIN_SPEED, speed - 40);
                break;
            case ITEM_TYPE.SLOW:
                speed = Math.min(INITIAL_SPEED * 2, speed + 40);
                break;
            case ITEM_TYPE.SHIELD:
                if (playerNum === 1) shield1 = true;
                else shield2 = true;
                break;
            case ITEM_TYPE.DOUBLE:
                if (playerNum === 1) doubleScore1 = true;
                else doubleScore2 = true;
                break;
            case ITEM_TYPE.GHOST:
                if (playerNum === 1) { ghostMode1 = true; ghostTimer1 = GHOST_DURATION; }
                else { ghostMode2 = true; ghostTimer2 = GHOST_DURATION; }
                break;
        }
    }

    function killPlayer(playerNum) {
        if (playerNum === 1) { alive1 = false; snake1 = []; }
        else { alive2 = false; snake2 = []; }
        fire('onSnakeDie', playerNum);
        if (mode === MODE.SINGLE) endGame();
    }

    function useShield(playerNum) {
        if (playerNum === 1) {
            shield1 = false;
            direction1 = { x: -direction1.x, z: -direction1.z };
            nextDirection1 = direction1;
        } else {
            shield2 = false;
            direction2 = { x: -direction2.x, z: -direction2.z };
            nextDirection2 = direction2;
        }
    }

    function placeFood() {
        var occupied = {};
        snake1.forEach(function(s) { occupied[s.x + ',' + s.z] = true; });
        snake2.forEach(function(s) { occupied[s.x + ',' + s.z] = true; });
        obstacles.forEach(function(o) { occupied[o.x + ',' + o.z] = true; });
        items.forEach(function(i) { occupied[i.x + ',' + i.z] = true; });

        var totalCells = GRID_SIZE * GRID_SIZE;
        if (Object.keys(occupied).length >= totalCells) { food = null; return; }

        for (var tries = 0; tries < 300; tries++) {
            var x = Math.floor(Math.random() * GRID_SIZE);
            var z = Math.floor(Math.random() * GRID_SIZE);
            if (!occupied[x + ',' + z]) { food = { x: x, z: z }; return; }
        }
        // 兜底扫描
        for (var fx = 0; fx < GRID_SIZE; fx++) {
            for (var fz = 0; fz < GRID_SIZE; fz++) {
                if (!occupied[fx + ',' + fz]) { food = { x: fx, z: fz }; return; }
            }
        }
        food = null;
    }

    function placeObstacles() {
        obstacles = [];
        var occupied = {};
        snake1.forEach(function(s) { occupied[s.x + ',' + s.z] = true; });
        snake2.forEach(function(s) { occupied[s.x + ',' + s.z] = true; });
        // 在网格中间区域留空（蛇出生点周围）
        var center = Math.floor(GRID_SIZE / 2);
        for (var dx = -3; dx <= 3; dx++) {
            for (var dz = -3; dz <= 3; dz++) {
                occupied[(center + dx) + ',' + (center + dz)] = true;
            }
        }

        for (var i = 0; i < obstacleCount; i++) {
            for (var tries = 0; tries < 100; tries++) {
                var x = Math.floor(Math.random() * GRID_SIZE);
                var z = Math.floor(Math.random() * GRID_SIZE);
                if (!occupied[x + ',' + z]) {
                    obstacles.push({ x: x, z: z });
                    occupied[x + ',' + z] = true;
                    break;
                }
            }
        }
    }

    function placePortals() {
        portalA = null; portalB = null; portalCooldown = 0;
        var occ = {};
        snake1.forEach(function(s) { occ[s.x+","+s.z] = true; });
        snake2.forEach(function(s) { occ[s.x+","+s.z] = true; });
        obstacles.forEach(function(o) { occ[o.x+","+o.z] = true; });
        var m = Math.floor(GRID_SIZE / 5);
        for (var t = 0; t < 100; t++) {
            var ax = m + Math.floor(Math.random() * (GRID_SIZE - m*2));
            var az = m + Math.floor(Math.random() * (GRID_SIZE - m*2));
            var bx = m + Math.floor(Math.random() * (GRID_SIZE - m*2));
            var bz = m + Math.floor(Math.random() * (GRID_SIZE - m*2));
            if (!occ[ax+","+az] && !occ[bx+","+bz] && (ax!==bx||az!==bz)) {
                portalA = { x: ax, z: az }; portalB = { x: bx, z: bz }; return;
            }
        }
    }

    function getPortals() { return portalA && portalB ? [portalA, portalB] : []; }
    function isGhost1() { return ghostMode1; }
    function isGhost2() { return ghostMode2; }

    function placeItem() {
        var occupied = {};
        snake1.forEach(function(s) { occupied[s.x + ',' + s.z] = true; });
        snake2.forEach(function(s) { occupied[s.x + ',' + s.z] = true; });
        obstacles.forEach(function(o) { occupied[o.x + ',' + o.z] = true; });
        if (food) occupied[food.x + ',' + food.z] = true;
        items.forEach(function(i) { occupied[i.x + ',' + i.z] = true; });

        var types = [ITEM_TYPE.SPEED, ITEM_TYPE.SLOW, ITEM_TYPE.SHIELD, ITEM_TYPE.DOUBLE, ITEM_TYPE.GHOST];
        for (var tries = 0; tries < 100; tries++) {
            var x = Math.floor(Math.random() * GRID_SIZE);
            var z = Math.floor(Math.random() * GRID_SIZE);
            if (!occupied[x + ',' + z]) {
                items.push({ x: x, z: z, type: types[Math.floor(Math.random() * types.length)] });
                return;
            }
        }
    }

    function endGame() {
        state = STATE.OVER;
        fire('onGameOver', mode === MODE.TWO_PLAYER ? { winner: winner } : score1);
        fire('onStateChange', state);
    }

    function fire(name, data) {
        if (callbacks[name]) {
            try { callbacks[name](data); } catch (e) { console.error('cb err:', e); }
        }
    }

    function getPublicState() {
        return {
            snake: snake1.slice(), snake2: snake2.slice(),
            food: food ? { x: food.x, z: food.z } : null,
            score: score1, score2: score2, speed: speed,
            state: state, mode: mode, theme: theme,
            winner: winner, alive1: alive1, alive2: alive2,
            gridSize: GRID_SIZE,
            items: items.slice(), obstacles: obstacles.slice(),
            shield1: shield1, shield2: shield2,
            doubleScore1: doubleScore1, doubleScore2: doubleScore2
        };
    }

    init();

    return {
        init: init, start: start, togglePause: togglePause, restart: restart,
        tick: tick, setDirection: setDirection, setDirectionP2: setDirectionP2,
        setMode: setMode, setGridSize: setGridSize, setTheme: setTheme,
        setDifficulty: setDifficulty, getDifficulty: getDifficulty,
        getMode: getMode, getTheme: getTheme, getWinner: getWinner,
        getGridSize: getGridSize, getSnake: getSnake, getSnake2: getSnake2,
        getFood: getFood, getScore: getScore, getScore2: getScore2,
        getSpeed: getSpeed, getState: getState,
        getItems: getItems, getObstacles: getObstacles,
        getItemDesc: getItemDesc,
        getPortals: getPortals, isGhost1: isGhost1, isGhost2: isGhost2,
        getCombo: function() { return combo; },
        hasShield1: hasShield1, hasShield2: hasShield2,
        isAlive1: isAlive1, isAlive2: isAlive2,
        on: on, STATE: STATE, MODE: MODE, THEME: THEME, DIFFICULTY: DIFFICULTY, ITEM_TYPE: ITEM_TYPE, DIR: DIR
    };
})();
