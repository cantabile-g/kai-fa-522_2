/**
 * main.js — Snake3D 主入口
 *
 * [成员C — 入口 + UI 绑定]
 * 职责：连接 GameEngine（游戏逻辑）和 Scene3D（3D渲染）、
 *       键盘输入、UI 更新（分数/状态显示）
 *
 * 依赖：GameEngine (game-core.js), Scene3D (scene.js)
 */

(function () {
    'use strict';

    // === DOM 元素 ===
    const gameContainer = document.getElementById('game-container');
    const scoreDisplay = document.getElementById('score-display');
    const speedDisplay = document.getElementById('speed-display');
    const overlayStart = document.getElementById('overlay-start');
    const overlayOver = document.getElementById('overlay-over');
    const overlayPause = document.getElementById('overlay-pause');
    const finalScore = document.getElementById('final-score');
    const highScoreDisplay = document.getElementById('high-score');
    const btnStart = document.getElementById('btn-start');
    const btnRestart = document.getElementById('btn-restart');

    // === 游戏循环 ===
    let gameTimer = null;
    let highScore = 0;

    // 加载最高分
    try {
        const saved = localStorage.getItem('snake3d-highscore');
        if (saved) highScore = parseInt(saved, 10) || 0;
    } catch (e) { /* ignore */ }

    // === 初始化 ===
    function init() {
        // 初始化 3D 场景
        Scene3D.init(gameContainer);

        // 注册游戏引擎回调
        GameEngine.on('onUpdate', function (state) {
            Scene3D.update(state);
        });

        GameEngine.on('onScoreChange', function (score) {
            scoreDisplay.textContent = score;
            updateSpeed(score);
        });

        GameEngine.on('onEatFood', function (pos) {
            Scene3D.emitFoodParticles(pos);
        });

        GameEngine.on('onGameOver', function (score) {
            stopGameLoop();
            if (score > highScore) {
                highScore = score;
                try { localStorage.setItem('snake3d-highscore', highScore); } catch (e) {}
            }
            showOverlay(overlayOver);
            finalScore.textContent = score;
            highScoreDisplay.textContent = highScore;
        });

        GameEngine.on('onStateChange', function (state) {
            if (state === GameEngine.STATE.PLAYING) {
                hideAllOverlays();
            } else if (state === GameEngine.STATE.PAUSED) {
                overlayPause.style.display = 'flex';
            }
        });

        // 初始渲染
        Scene3D.update(GameEngine.getSnake ? {
            snake: GameEngine.getSnake(),
            food: GameEngine.getFood()
        } : { snake: [], food: null });

        // 开始渲染循环
        Scene3D.startRenderLoop();

        // 显示开始界面
        showOverlay(overlayStart);
        highScoreDisplay.textContent = highScore;
    }

    /**
     * 开始游戏
     */
    function startGame() {
        GameEngine.start();
        scoreDisplay.textContent = '0';
        updateSpeed(0);
        startGameLoop();
    }

    /**
     * 重新开始
     */
    function restartGame() {
        GameEngine.restart();
        scoreDisplay.textContent = '0';
        updateSpeed(0);
        startGameLoop();
    }

    /**
     * 启动游戏循环定时器
     */
    function startGameLoop() {
        stopGameLoop();
        gameTimer = setInterval(function () {
            const alive = GameEngine.tick();
            if (!alive) {
                stopGameLoop();
            }
        }, GameEngine.getSpeed());
    }

    /**
     * 停止游戏循环
     */
    function stopGameLoop() {
        if (gameTimer) {
            clearInterval(gameTimer);
            gameTimer = null;
        }
    }

    /**
     * 更新速度显示
     */
    function updateSpeed(score) {
        speedDisplay.textContent = 'Lv.' + (Math.floor(score / 50) + 1);
    }

    /**
     * 显示遮罩层
     */
    function showOverlay(overlay) {
        hideAllOverlays();
        overlay.style.display = 'flex';
    }

    /**
     * 隐藏所有遮罩
     */
    function hideAllOverlays() {
        overlayStart.style.display = 'none';
        overlayOver.style.display = 'none';
        overlayPause.style.display = 'none';
    }

    // === 键盘事件 ===
    document.addEventListener('keydown', function (e) {
        const state = GameEngine.getState();

        // 空格：开始 / 暂停
        if (e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
            if (state === GameEngine.STATE.IDLE) {
                startGame();
                return;
            }
            if (state === GameEngine.STATE.OVER) {
                restartGame();
                return;
            }
            if (state === GameEngine.STATE.PLAYING || state === GameEngine.STATE.PAUSED) {
                GameEngine.togglePause();
                return;
            }
        }

        // 方向键 / WASD
        if (state !== GameEngine.STATE.PLAYING) return;

        switch (e.code) {
            case 'ArrowUp':    case 'KeyW':
                e.preventDefault();
                GameEngine.setDirection(GameEngine.DIR.UP);
                break;
            case 'ArrowDown':  case 'KeyS':
                e.preventDefault();
                GameEngine.setDirection(GameEngine.DIR.DOWN);
                break;
            case 'ArrowLeft':  case 'KeyA':
                e.preventDefault();
                GameEngine.setDirection(GameEngine.DIR.LEFT);
                break;
            case 'ArrowRight': case 'KeyD':
                e.preventDefault();
                GameEngine.setDirection(GameEngine.DIR.RIGHT);
                break;
        }
    });

    // === 按钮点击 ===
    btnStart.addEventListener('click', startGame);
    btnRestart.addEventListener('click', restartGame);

    // === 移动端触摸支持 ===
    let touchStartX = 0, touchStartY = 0;
    gameContainer.addEventListener('touchstart', function (e) {
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    });

    gameContainer.addEventListener('touchend', function (e) {
        const state = GameEngine.getState();
        if (state === GameEngine.STATE.IDLE) {
            startGame();
            return;
        }
        if (state === GameEngine.STATE.OVER) {
            restartGame();
            return;
        }
        if (state !== GameEngine.STATE.PLAYING) return;

        const touch = e.changedTouches[0];
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;

        if (Math.abs(dx) > Math.abs(dy)) {
            GameEngine.setDirection(dx > 0 ? GameEngine.DIR.RIGHT : GameEngine.DIR.LEFT);
        } else {
            GameEngine.setDirection(dy > 0 ? GameEngine.DIR.DOWN : GameEngine.DIR.UP);
        }
    });

    // === 启动 ===
    init();

})();
