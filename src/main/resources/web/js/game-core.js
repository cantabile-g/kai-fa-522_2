/**
 * game-core.js — Snake3D 游戏核心逻辑
 *
 * [成员A — 游戏核心逻辑]
 * 纯逻辑模块，不依赖 Three.js，只依赖纯数据操作。
 *
 * 游戏规则：
 *   - 18x18 网格棋盘
 *   - 蛇初始 3 节，方向向右
 *   - 吃食物 +10 分，蛇身增长 1 节
 *   - 撞墙或撞自己 → 游戏结束
 *   - 速度随分数递增（180ms → 60ms 最低）
 *
 * 对外接口：
 *   GameEngine.init()      — 初始化
 *   GameEngine.start()     — 开始游戏
 *   GameEngine.pause()     — 暂停/继续
 *   GameEngine.restart()   — 重新开始
 *   GameEngine.tick()      — 每帧更新（由外部定时器调用）
 *   GameEngine.setDirection(dir) — 设置方向
 */

var GameEngine = (function () {
    'use strict';

    // === 常量 ===
    const GRID_SIZE = 18;
    const INITIAL_SPEED = 180;
    const MIN_SPEED = 60;
    const SPEED_STEP = 10;
    const FOOD_PER_SPEEDUP = 5;
    const SCORE_PER_FOOD = 10;

    // === 游戏状态枚举 ===
    const STATE = { IDLE: 'idle', PLAYING: 'playing', PAUSED: 'paused', OVER: 'over' };

    // === 方向枚举 ===
    const DIR = {
        UP:    { x:  0, z: -1 },
        DOWN:  { x:  0, z:  1 },
        LEFT:  { x: -1, z:  0 },
        RIGHT: { x:  1, z:  0 }
    };

    // === 内部状态 ===
    let snake = [];           // [{x, z}, ...] head 在 index 0
    let direction = null;     // 当前方向
    let nextDirection = null; // 缓冲方向（防止同帧反向）
    let food = null;          // {x, z}
    let score = 0;
    let speed = INITIAL_SPEED;
    let state = STATE.IDLE;

    // === 回调注册 ===
    let callbacks = {
        onUpdate: null,       // function(state) 每次状态变更
        onScoreChange: null,  // function(score) 分数变化
        onGameOver: null,     // function(score) 游戏结束
        onEatFood: null,      // function(pos) 吃到食物
        onStateChange: null   // function(newState) 状态变更
    };

    // === 公开接口 ===

    function getGridSize() {
        return GRID_SIZE;
    }

    function getSnake() {
        return snake.slice(); // 返回拷贝
    }

    function getFood() {
        return food ? Object.assign({}, food) : null;
    }

    function getScore() {
        return score;
    }

    function getSpeed() {
        return speed;
    }

    function getState() {
        return state;
    }

    function getDirection() {
        return direction ? Object.assign({}, direction) : null;
    }

    function on(event, callback) {
        callbacks[event] = callback;
    }

    /**
     * 初始化游戏状态
     */
    function init() {
        const center = Math.floor(GRID_SIZE / 2);
        snake = [
            { x: center, z: center },
            { x: center - 1, z: center },
            { x: center - 2, z: center }
        ];
        direction = DIR.RIGHT;
        nextDirection = DIR.RIGHT;
        score = 0;
        speed = INITIAL_SPEED;
        state = STATE.IDLE;
        placeFood();
        fireCallback('onUpdate', getPublicState());
        fireCallback('onStateChange', state);
    }

    /**
     * 开始 / 重新开始游戏
     */
    function start() {
        if (state === STATE.OVER || state === STATE.IDLE) {
            init();
        }
        state = STATE.PLAYING;
        fireCallback('onStateChange', state);
        fireCallback('onUpdate', getPublicState());
    }

    /**
     * 暂停 / 继续切换
     */
    function togglePause() {
        if (state === STATE.PLAYING) {
            state = STATE.PAUSED;
        } else if (state === STATE.PAUSED) {
            state = STATE.PLAYING;
        }
        fireCallback('onStateChange', state);
    }

    /**
     * 重新开始
     */
    function restart() {
        init();
        start();
    }

    /**
     * 设置方向（自动防止反向）
     */
    function setDirection(dir) {
        if (state !== STATE.PLAYING) return;
        if (!dir || (dir.x === 0 && dir.z === 0)) return;

        // 防止反向：不能掉头
        if (direction) {
            if (dir.x === -direction.x && dir.z === -direction.z) return;
        }
        nextDirection = dir;
    }

    /**
     * 每步逻辑更新（由外部定时器驱动）
     * 返回 false 表示游戏结束
     */
    function tick() {
        if (state !== STATE.PLAYING) return true;

        // 应用缓冲方向
        if (nextDirection) {
            direction = nextDirection;
        }

        // 计算新头部位置
        const head = snake[0];
        const newHead = {
            x: head.x + direction.x,
            z: head.z + direction.z
        };

        // 撞墙检测
        if (newHead.x < 0 || newHead.x >= GRID_SIZE ||
            newHead.z < 0 || newHead.z >= GRID_SIZE) {
            endGame();
            return false;
        }

        // 撞自己检测（跳过最后一节，因为马上要删掉）
        for (let i = 0; i < snake.length - 1; i++) {
            if (snake[i].x === newHead.x && snake[i].z === newHead.z) {
                endGame();
                return false;
            }
        }

        // 移动：头部插入
        snake.unshift(newHead);

        // 吃食物检测
        if (food && newHead.x === food.x && newHead.z === food.z) {
            score += SCORE_PER_FOOD;
            fireCallback('onScoreChange', score);
            fireCallback('onEatFood', food);

            // 速度递增
            let foodEaten = Math.floor(score / SCORE_PER_FOOD);
            if (foodEaten > 0 && foodEaten % FOOD_PER_SPEEDUP === 0) {
                speed = Math.max(MIN_SPEED, INITIAL_SPEED - (foodEaten / FOOD_PER_SPEEDUP) * SPEED_STEP);
            }

            placeFood();
            // 不吃就删尾巴（已经 unshift 了新头）
        } else {
            snake.pop();
        }

        fireCallback('onUpdate', getPublicState());
        return true;
    }

    /**
     * 随机放置食物（确保不在蛇身上）
     */
    function placeFood() {
        const occupied = new Set(snake.map(s => s.x + ',' + s.z));

        // 格子全满 → 胜利
        if (occupied.size >= GRID_SIZE * GRID_SIZE) {
            food = null;
            return;
        }

        let attempts = 0;
        while (attempts < 100) {
            const x = Math.floor(Math.random() * GRID_SIZE);
            const z = Math.floor(Math.random() * GRID_SIZE);
            if (!occupied.has(x + ',' + z)) {
                food = { x: x, z: z };
                return;
            }
            attempts++;
        }

        // 兜底：扫描所有空位
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let z = 0; z < GRID_SIZE; z++) {
                if (!occupied.has(x + ',' + z)) {
                    food = { x: x, z: z };
                    return;
                }
            }
        }
        food = null;
    }

    function endGame() {
        state = STATE.OVER;
        fireCallback('onGameOver', score);
        fireCallback('onStateChange', state);
    }

    function fireCallback(name, data) {
        if (callbacks[name]) {
            try {
                callbacks[name](data);
            } catch (e) {
                console.error('GameEngine callback error [' + name + ']:', e);
            }
        }
    }

    function getPublicState() {
        return {
            snake: snake.slice(),
            food: food ? Object.assign({}, food) : null,
            score: score,
            speed: speed,
            state: state,
            direction: direction ? Object.assign({}, direction) : null,
            gridSize: GRID_SIZE
        };
    }

    // 初始状态
    init();

    // === 暴露公开 API ===
    return {
        init: init,
        start: start,
        togglePause: togglePause,
        restart: restart,
        tick: tick,
        setDirection: setDirection,
        getGridSize: getGridSize,
        getSnake: getSnake,
        getFood: getFood,
        getScore: getScore,
        getSpeed: getSpeed,
        getState: getState,
        getDirection: getDirection,
        on: on,
        STATE: STATE,
        DIR: DIR
    };
})();
