/**
 * main.js — Snake3D 主入口（RAF游戏循环+灵敏度优化）
 *
 * [成员A — 入口 + UI 绑定]
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
    var btnMenu = document.getElementById('btn-menu');
    var selGridSize = document.getElementById('sel-grid-size');
    var selTheme = document.getElementById('sel-theme');
    var selDifficulty = document.getElementById('sel-difficulty');
    var itemToast = document.getElementById('item-toast');
    var toastTimer = null;

    // RAF 游戏循环
    var rafId = null;
    var accumulator = 0;
    var lastTime = 0;
    var gameSpeed = 180;
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
            gameSpeed = state.speed;
            var s1 = document.getElementById('shield1-badge');
            if (s1 && state) s1.style.display = state.shield1 ? 'inline' : 'none';
        });

        GameEngine.on('onScoreChange', function (data) {
            if (typeof data === 'object') {
                if (data.player === 1) scoreDisplay.textContent = data.score;
                else score2Display.textContent = data.score;
            } else {
                scoreDisplay.textContent = data;
            }
            updateSpeed(typeof data === 'object' ? data.score : data);
            if (data && data.combo >= 1) {
                showItemToastExt('COMBO x' + (1 + data.combo * 0.5) + '!', '#ffd700');
            }
        });

        GameEngine.on('onEatFood', function (pos) {
            Scene3D.emitFoodParticles(pos);
        });

        GameEngine.on('onEatItem', function (data) {
            if (data && data.pos) Scene3D.emitFoodParticles(data.pos);
            if (data && data.type) showItemToast(data.type);
        });

        GameEngine.on('onSnakeDie', function () {});

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

    function showItemToast(type) {
        if (toastTimer) clearTimeout(toastTimer);
        var desc = GameEngine.getItemDesc(type);
        itemToast.textContent = desc;
        itemToast.className = 'item-toast ' + type;
        itemToast.style.display = 'block';
        itemToast.style.animation = 'none';
        itemToast.offsetHeight;
        itemToast.style.animation = 'toastFade 1.5s ease-out forwards';
        toastTimer = setTimeout(function() { itemToast.style.display = 'none'; }, 1400);
    }

    function showItemToastExt(msg, color) {
        if (toastTimer) clearTimeout(toastTimer);
        itemToast.textContent = msg;
        itemToast.className = 'item-toast';
        itemToast.style.color = color;
        itemToast.style.display = 'block';
        itemToast.style.animation = 'none';
        itemToast.offsetHeight;
        itemToast.style.animation = 'toastFade 1.2s ease-out forwards';
        toastTimer = setTimeout(function() { itemToast.style.display = 'none'; }, 1100);
    }

    function startGame(mode) {
        isTwoPlayer = (mode === 'twoPlayer');
        var gs = parseInt(selGridSize.value, 10) || 18;
        GameEngine.setGridSize(gs);
        GameEngine.setTheme(selTheme.value || 'dark');
        GameEngine.setDifficulty(selDifficulty.value || 'normal');
        GameEngine.setMode(isTwoPlayer ? GameEngine.MODE.TWO_PLAYER : GameEngine.MODE.SINGLE);
        GameEngine.start();
        scoreDisplay.textContent = '0';
        if (score2Display) score2Display.textContent = '0';
        updateSpeed(0);
        document.getElementById('hud-p2').style.display = isTwoPlayer ? 'block' : 'none';
        gameSpeed = GameEngine.getSpeed();
        startGameLoop();
    }

    function restartGame() {
        startGame(isTwoPlayer ? 'twoPlayer' : 'single');
    }

    // RAF 驱动游戏循环，累加器模式
    function startGameLoop() {
        stopGameLoop();
        accumulator = 0;
        lastTime = performance.now();
        rafId = requestAnimationFrame(gameLoop);
    }

    function gameLoop(timestamp) {
        if (!timestamp) timestamp = performance.now();
        var dt = timestamp - lastTime;
        lastTime = timestamp;
        accumulator += dt;

        // 消耗累积时间，每次 tick 消耗 gameSpeed ms
        var ticked = false;
        while (accumulator >= gameSpeed) {
            accumulator -= gameSpeed;
            var alive = GameEngine.tick();
            ticked = true;
            if (!alive) {
                stopGameLoop();
                return;
            }
        }

        rafId = requestAnimationFrame(gameLoop);
    }

    function stopGameLoop() {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    function updateSpeed(score) {
        var s = typeof score === 'object' ? score : parseInt(score, 10) || 0;
        speedDisplay.textContent = 'Lv.' + (Math.floor(s / 50) + 1);
    }

    function showOverlay(overlay) { hideAllOverlays(); overlay.style.display = 'flex'; }
    function hideAllOverlays() {
        overlayStart.style.display = 'none';
        overlayOver.style.display = 'none';
        overlayPause.style.display = 'none';
    }

    // === 键盘 ===
    document.addEventListener('keydown', function (e) {
        var state = GameEngine.getState();
        var twoP = GameEngine.getMode() === GameEngine.MODE.TWO_PLAYER;
        var al1 = GameEngine.isAlive1 ? GameEngine.isAlive1() : true;
        var al2 = GameEngine.isAlive2 ? GameEngine.isAlive2() : true;

        if (e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
            if (state === GameEngine.STATE.IDLE) { startGame('single'); return; }
            if (state === GameEngine.STATE.OVER) { restartGame(); return; }
            if (state === GameEngine.STATE.PLAYING || state === GameEngine.STATE.PAUSED) {
                GameEngine.togglePause();
                if (GameEngine.getState() === GameEngine.STATE.PLAYING) {
                    lastTime = performance.now();
                    accumulator = 0;
                    rafId = requestAnimationFrame(gameLoop);
                }
                return;
            }
        }

        if (state !== GameEngine.STATE.PLAYING) return;

        if (al1) {
            var turned = false;
            switch (e.code) {
                case 'KeyW': e.preventDefault(); turned = GameEngine.setDirection(GameEngine.DIR.UP); break;
                case 'KeyS': e.preventDefault(); turned = GameEngine.setDirection(GameEngine.DIR.DOWN); break;
                case 'KeyA': e.preventDefault(); turned = GameEngine.setDirection(GameEngine.DIR.LEFT); break;
                case 'KeyD': e.preventDefault(); turned = GameEngine.setDirection(GameEngine.DIR.RIGHT); break;
            }
            if (turned) accumulator = gameSpeed; // 即时响应
        }
        if (twoP && al2) {
            var turned2 = false;
            switch (e.code) {
                case 'ArrowUp':    e.preventDefault(); turned2 = GameEngine.setDirectionP2(GameEngine.DIR.UP); break;
                case 'ArrowDown':  e.preventDefault(); turned2 = GameEngine.setDirectionP2(GameEngine.DIR.DOWN); break;
                case 'ArrowLeft':  e.preventDefault(); turned2 = GameEngine.setDirectionP2(GameEngine.DIR.LEFT); break;
                case 'ArrowRight': e.preventDefault(); turned2 = GameEngine.setDirectionP2(GameEngine.DIR.RIGHT); break;
            }
            if (turned2) accumulator = gameSpeed;
        }
    });

    btnStart.addEventListener('click', function() { startGame('single'); });
    btnStart2P.addEventListener('click', function() { startGame('twoPlayer'); });
    btnRestart.addEventListener('click', restartGame);
    btnMenu.addEventListener('click', function() {
        stopGameLoop();
        showOverlay(overlayStart);
    });

    var touchStartX = 0, touchStartY = 0;
    gameContainer.addEventListener('touchstart', function (e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });
    gameContainer.addEventListener('touchend', function (e) {
        var state = GameEngine.getState();
        if (state === GameEngine.STATE.IDLE) { startGame('single'); return; }
        if (state === GameEngine.STATE.OVER) { restartGame(); return; }
        if (state !== GameEngine.STATE.PLAYING) return;
        var dx = e.changedTouches[0].clientX - touchStartX;
        var dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) > Math.abs(dy)) {
            GameEngine.setDirection(dx > 0 ? GameEngine.DIR.RIGHT : GameEngine.DIR.LEFT);
        } else {
            GameEngine.setDirection(dy > 0 ? GameEngine.DIR.DOWN : GameEngine.DIR.UP);
        }
    });

    init();
})();
