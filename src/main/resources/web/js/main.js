/**
 * main.js — Snake3D 主入口（支持单/双人模式）
 *
 * [成员C — 入口 + UI 绑定]
 * 依赖：GameEngine, Scene3D
 */

(function () {
    'use strict';

    var gameContainer = document.getElementById('game-container');
    var scoreDisplay = document.getElementById('score-display');
    var score2Display = document.getElementById('score2-display');
    var speedDisplay = document.getElementById('speed-display');
    var overlayStart = document.getElementById('overlay-start');
    var overlayOver = document.getElementById('overlay-over');
    var overlayPause = document.getElementById('overlay-pause');
    var finalScore = document.getElementById('final-score');
    var highScoreDisplay = document.getElementById('high-score');
    var winnerText = document.getElementById('winner-text');
    var btnStart = document.getElementById('btn-start');
    var btnStart2P = document.getElementById('btn-start-2p');
    var btnRestart = document.getElementById('btn-restart');
    var selGridSize = document.getElementById('sel-grid-size');
    var selTheme = document.getElementById('sel-theme');

    var gameTimer = null;
    var highScore = 0;
    var isTwoPlayer = false;

    try {
        var saved = localStorage.getItem('snake3d-highscore');
        if (saved) highScore = parseInt(saved, 10) || 0;
    } catch (e) {}

    function init() {
        Scene3D.init(gameContainer);

        GameEngine.on('onUpdate', function (state) {
            Scene3D.update(state);
        });

        GameEngine.on('onScoreChange', function (data) {
            if (typeof data === 'object') {
                if (data.player === 1) scoreDisplay.textContent = data.score;
                else score2Display.textContent = data.score;
            } else {
                scoreDisplay.textContent = data;
            }
            updateSpeed(typeof data === 'object' ? data.score : data);
        });

        GameEngine.on('onEatFood', function (pos) {
            Scene3D.emitFoodParticles(pos);
        });

        GameEngine.on('onEatItem', function (data) {
            // 道具粒子
            if (data && data.pos) Scene3D.emitFoodParticles(data.pos);
        });

        GameEngine.on('onSnakeDie', function (playerNum) {
            // 双人模式淘汰特效（闪烁处理在渲染侧）
        });

        GameEngine.on('onGameOver', function (result) {
            stopGameLoop();
            if (isTwoPlayer) {
                var msg = result.winner === 1 ? '玩家1 获胜！' :
                          result.winner === 2 ? '玩家2 获胜！' : '平局！';
                winnerText.textContent = msg;
                winnerText.style.color = result.winner === 1 ? '#4caf50' :
                                        result.winner === 2 ? '#2196F3' : '#ffd700';
            } else {
                var score = result;
                if (score > highScore) {
                    highScore = score;
                    try { localStorage.setItem('snake3d-highscore', highScore); } catch (e) {}
                }
                finalScore.textContent = score;
                highScoreDisplay.textContent = highScore;
            }
            showOverlay(overlayOver);
        });

        GameEngine.on('onStateChange', function (state) {
            if (state === GameEngine.STATE.PLAYING) hideAllOverlays();
            else if (state === GameEngine.STATE.PAUSED) overlayPause.style.display = 'flex';
        });

        Scene3D.update({ snake: [], snake2: [], food: null });
        Scene3D.startRenderLoop();
        showOverlay(overlayStart);
        highScoreDisplay.textContent = highScore;
    }

    function startGame(mode) {
        isTwoPlayer = (mode === 'twoPlayer');
        // 应用地图设置
        var gs = parseInt(selGridSize.value, 10) || 18;
        GameEngine.setGridSize(gs);
        GameEngine.setTheme(selTheme.value || 'dark');
        GameEngine.setMode(isTwoPlayer ? GameEngine.MODE.TWO_PLAYER : GameEngine.MODE.SINGLE);
        GameEngine.start();
        scoreDisplay.textContent = '0';
        if (score2Display) score2Display.textContent = '0';
        updateSpeed(0);
        // 双人模式显示两个分数
        document.getElementById('hud-p2').style.display = isTwoPlayer ? 'block' : 'none';
        startGameLoop();
    }

    function restartGame() {
        startGame(isTwoPlayer ? 'twoPlayer' : 'single');
    }

    function startGameLoop() {
        stopGameLoop();
        gameTimer = setInterval(function () {
            var alive = GameEngine.tick();
            if (!alive) stopGameLoop();
        }, GameEngine.getSpeed());
    }

    function stopGameLoop() {
        if (gameTimer) { clearInterval(gameTimer); gameTimer = null; }
    }

    function updateSpeed(score) {
        var s = typeof score === 'object' ? score : parseInt(score, 10) || 0;
        speedDisplay.textContent = 'Lv.' + (Math.floor(s / 50) + 1);
    }

    function showOverlay(overlay) {
        hideAllOverlays();
        overlay.style.display = 'flex';
    }

    function hideAllOverlays() {
        overlayStart.style.display = 'none';
        overlayOver.style.display = 'none';
        overlayPause.style.display = 'none';
    }

    // === 键盘 ===
    document.addEventListener('keydown', function (e) {
        var state = GameEngine.getState();
        var twoP = GameEngine.getMode() === GameEngine.MODE.TWO_PLAYER;
        var alive1 = GameEngine.isAlive1 ? GameEngine.isAlive1() : true;
        var alive2 = GameEngine.isAlive2 ? GameEngine.isAlive2() : true;

        // Space
        if (e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
            if (state === GameEngine.STATE.IDLE) { startGame('single'); return; }
            if (state === GameEngine.STATE.OVER) { restartGame(); return; }
            if (state === GameEngine.STATE.PLAYING || state === GameEngine.STATE.PAUSED) {
                GameEngine.togglePause(); return;
            }
        }

        if (state !== GameEngine.STATE.PLAYING) return;

        // P1: WASD
        if (alive1) {
            switch (e.code) {
                case 'KeyW': e.preventDefault(); GameEngine.setDirection(GameEngine.DIR.UP); break;
                case 'KeyS': e.preventDefault(); GameEngine.setDirection(GameEngine.DIR.DOWN); break;
                case 'KeyA': e.preventDefault(); GameEngine.setDirection(GameEngine.DIR.LEFT); break;
                case 'KeyD': e.preventDefault(); GameEngine.setDirection(GameEngine.DIR.RIGHT); break;
            }
        }

        // P2: Arrow keys (only in two-player mode)
        if (twoP && alive2) {
            switch (e.code) {
                case 'ArrowUp':    e.preventDefault(); GameEngine.setDirectionP2(GameEngine.DIR.UP); break;
                case 'ArrowDown':  e.preventDefault(); GameEngine.setDirectionP2(GameEngine.DIR.DOWN); break;
                case 'ArrowLeft':  e.preventDefault(); GameEngine.setDirectionP2(GameEngine.DIR.LEFT); break;
                case 'ArrowRight': e.preventDefault(); GameEngine.setDirectionP2(GameEngine.DIR.RIGHT); break;
            }
        }
    });

    btnStart.addEventListener('click', function() { startGame('single'); });
    btnStart2P.addEventListener('click', function() { startGame('twoPlayer'); });
    btnRestart.addEventListener('click', restartGame);

    // 移动端触摸（单人模式）
    var touchStartX = 0, touchStartY = 0;
    gameContainer.addEventListener('touchstart', function (e) {
        var touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    });

    gameContainer.addEventListener('touchend', function (e) {
        var state = GameEngine.getState();
        if (state === GameEngine.STATE.IDLE) { startGame('single'); return; }
        if (state === GameEngine.STATE.OVER) { restartGame(); return; }
        if (state !== GameEngine.STATE.PLAYING) return;
        var touch = e.changedTouches[0];
        var dx = touch.clientX - touchStartX;
        var dy = touch.clientY - touchStartY;
        if (Math.abs(dx) > Math.abs(dy)) {
            GameEngine.setDirection(dx > 0 ? GameEngine.DIR.RIGHT : GameEngine.DIR.LEFT);
        } else {
            GameEngine.setDirection(dy > 0 ? GameEngine.DIR.DOWN : GameEngine.DIR.UP);
        }
    });

    init();
})();
