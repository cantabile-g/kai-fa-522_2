/**
 * test-game.js — Snake3D 游戏引擎单元测试
 * 用法: node test-game.js
 * 测试 game-core.js 的核心逻辑，不依赖浏览器环境
 */

const fs = require('fs');
const path = require('path');

// 加载 game-core.js（模拟浏览器全局环境）
const gameCorePath = path.join(__dirname, 'src', 'main', 'resources', 'web', 'js', 'game-core.js');
const gameCode = fs.readFileSync(gameCorePath, 'utf8');

// 使用 vm 模块在沙箱中执行，GameEngine 绑定到 global
const vm = require('vm');
const sandbox = { GameEngine: null };
vm.createContext(sandbox);
const wrappedCode = gameCode.replace('var GameEngine = (function', 'GameEngine = (function');
vm.runInContext(wrappedCode, sandbox);
global.GameEngine = sandbox.GameEngine;

// 设置为单人模式（兼容新版 multiplayer API）
GameEngine.setMode(GameEngine.MODE.SINGLE);

var passed = 0;
var failed = 0;

function assert(condition, name) {
    if (condition) {
        console.log('  PASS: ' + name);
        passed++;
    } else {
        console.log('  FAIL: ' + name);
        failed++;
    }
}

// ============================================================
// 测试 1: 初始化状态
// ============================================================
console.log('\n=== Test 1: 初始化状态 ===');
GameEngine.init();
assert(GameEngine.getState() === GameEngine.STATE.IDLE, '初始状态为 IDLE');
assert(GameEngine.getScore() === 0, '初始分数为 0');
assert(GameEngine.getSnake().length === 3, '初始蛇长为 3');
assert(GameEngine.getGridSize() === 18, '网格大小为 18');

// ============================================================
// 测试 2: 游戏启动与移动
// ============================================================
console.log('\n=== Test 2: 游戏启动与移动 ===');
GameEngine.start();
assert(GameEngine.getState() === GameEngine.STATE.PLAYING, 'start() 后状态为 PLAYING');

var headBefore = GameEngine.getSnake()[0];
GameEngine.tick();
var headAfter = GameEngine.getSnake()[0];
assert(headAfter.x === headBefore.x + 1 && headAfter.z === headBefore.z, '默认方向向右移动 1 格');
assert(GameEngine.getSnake().length === 3, '未吃食物蛇长不变');

// ============================================================
// 测试 3: 方向控制
// ============================================================
console.log('\n=== Test 3: 方向控制 ===');
GameEngine.restart();
GameEngine.start();

GameEngine.setDirection(GameEngine.DIR.DOWN);
GameEngine.tick();
var head = GameEngine.getSnake()[0];
assert(head.z === 10, '向下移动后 z 坐标 +1');

// 反向阻止
GameEngine.setDirection(GameEngine.DIR.UP);
GameEngine.tick();
head = GameEngine.getSnake()[0];
assert(head.z === 11, '反向操作被阻止，继续向下');

// 左转
GameEngine.setDirection(GameEngine.DIR.LEFT);
GameEngine.tick();
head = GameEngine.getSnake()[0];
assert(head.x === 7, '左转正常（蛇起始位置 center-1=8）');

// ============================================================
// 测试 4: 撞墙检测
// ============================================================
console.log('\n=== Test 4: 撞墙检测 ===');
GameEngine.restart();
GameEngine.start();

// 蛇头在 (8,9)，方向向右，网格 0..17，需要 10 步撞墙
for (var i = 0; i < 10; i++) {
    var alive = GameEngine.tick();
    if (!alive) break;
}
assert(GameEngine.getState() === GameEngine.STATE.OVER, '撞右墙后状态为 OVER');

// 撞左墙：先转 UP 再转 LEFT（不能从 RIGHT 直接反向）
GameEngine.restart();
GameEngine.start();
GameEngine.setDirection(GameEngine.DIR.UP);
GameEngine.tick();
GameEngine.setDirection(GameEngine.DIR.LEFT);
for (var i = 0; i < 9; i++) {
    var alive = GameEngine.tick();
    if (!alive) break;
}
assert(GameEngine.getState() === GameEngine.STATE.OVER, '撞左墙后状态为 OVER');

// 撞上墙
GameEngine.restart();
GameEngine.start();
GameEngine.setDirection(GameEngine.DIR.UP);
for (var i = 0; i < 10; i++) {
    var alive = GameEngine.tick();
    if (!alive) break;
}
assert(GameEngine.getState() === GameEngine.STATE.OVER, '撞上墙后状态为 OVER');

// ============================================================
// 测试 5: 暂停/恢复
// ============================================================
console.log('\n=== Test 5: 暂停/恢复 ===');
GameEngine.restart();
GameEngine.start();
assert(GameEngine.getState() === GameEngine.STATE.PLAYING, '开始后为 PLAYING');

GameEngine.togglePause();
assert(GameEngine.getState() === GameEngine.STATE.PAUSED, '暂停后为 PAUSED');

// 暂停时 tick 不应改变状态
GameEngine.tick();
var headPaused = GameEngine.getSnake()[0];
assert(headPaused.x === 8 && headPaused.z === 9, '暂停时蛇不移动（起始位置 8,9）');

GameEngine.togglePause();
assert(GameEngine.getState() === GameEngine.STATE.PLAYING, '恢复后为 PLAYING');

// ============================================================
// 测试 6: 重新开始
// ============================================================
console.log('\n=== Test 6: 重新开始 ===');
GameEngine.restart();
GameEngine.start();

for (var i = 0; i < 3; i++) GameEngine.tick();
assert(GameEngine.getScore() >= 0, '移动后分数正常');

GameEngine.restart();
assert(GameEngine.getScore() === 0, 'restart() 后分数重置为 0');
assert(GameEngine.getState() === GameEngine.STATE.PLAYING, 'restart() 后自动进入 PLAYING 状态');

// ============================================================
// 测试 7: 食物生成与吃食物
// ============================================================
console.log('\n=== Test 7: 食物生成 ===');
GameEngine.restart();
GameEngine.start();

var food = GameEngine.getFood();
assert(food !== null, '食物已生成');
assert(food.x >= 0 && food.x < 18, '食物 x 在范围内');
assert(food.z >= 0 && food.z < 18, '食物 z 在范围内');

// 食物不在蛇身上
var snake = GameEngine.getSnake();
var onSnake = snake.some(function(s) { return s.x === food.x && s.z === food.z; });
assert(!onSnake, '食物不在蛇身上');

// ============================================================
// 测试 8: 速度递增
// ============================================================
console.log('\n=== Test 8: 速度递增 ===');
GameEngine.restart();
GameEngine.start();

var initialSpeed = GameEngine.getSpeed();
assert(initialSpeed === 180, '初始速度 180ms');

// ============================================================
// 测试 9: 方向缓冲
// ============================================================
console.log('\n=== Test 9: 方向缓冲 ===');
GameEngine.restart();
GameEngine.start();

// 方向缓冲：连续快速按键，最后一个非反向方向生效
GameEngine.setDirection(GameEngine.DIR.UP);     // 从 RIGHT 可以转 UP
GameEngine.setDirection(GameEngine.DIR.DOWN);   // 从 RIGHT 不能转 DOWN（？）可以，不是反向
GameEngine.tick();
var head = GameEngine.getSnake()[0];
assert(head.z === 10, '方向缓冲：最后一个方向生效（从 RIGHT 转 DOWN）');

// 再次测试：当前方向 DOWN，尝试反向 UP 被阻止
GameEngine.setDirection(GameEngine.DIR.UP);     // UP 是 DOWN 的反向，应被阻止
GameEngine.tick();
head = GameEngine.getSnake()[0];
assert(head.z === 11, '反向保护：UP 被阻止，继续 DOWN>');

// ============================================================
// 结果汇总
// ============================================================
console.log('\n========================================');
console.log('  测试结果: ' + passed + ' 通过, ' + failed + ' 失败');
console.log('  总计: ' + (passed + failed) + ' 项测试');
console.log('========================================');

process.exit(failed > 0 ? 1 : 0);
