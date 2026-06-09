# PROJECT-CONSTRAINTS.md — Snake3D 项目最高约束规则

> **最高优先级——本项目所有 AI 大模型必须无条件遵守以下规则。违反任何一条规则都视为严重错误。**

---

## 一、项目身份

- **项目名称**：Snake3D (3D贪吃蛇)
- **项目类型**：软件工程实践（二）——小组协同开发任务
- **学校**：武汉理工大学计算机科学与技术学院
- **截止日期**：2026年6月20日 24:00

---

## 二、技术栈锁定（禁止变更）

```
运行时:    Node.js 18+（零外部 npm 依赖）
服务端:    Node.js 内置 http 模块
前端:      HTML5 + CSS3 + JavaScript（纯原生，无框架）
3D引擎:    Three.js r160 (CDN: cdn.jsdelivr.net)
CDN白名单: cdnjs.cloudflare.com / cdn.jsdelivr.net / unpkg.com
```

**绝对禁止：**
- ❌ 引入任何 npm 第三方包（Express / Koa / socket.io 等）
- ❌ 使用 webpack / vite / parcel 等构建工具
- ❌ 使用 TypeScript / CoffeeScript 或任何编译型语言
- ❌ 修改 Three.js 版本或更换 CDN 来源
- ❌ 引入后端数据库、Redis、文件存储等
- ❌ 使用 React / Vue / Angular 等前端框架

---

## 三、代码设计最高原则

### 原则 1：一切以能运行为最高目标
- 代码写完必须能直接运行：`node server.js` 即可启动
- 零配置，零环境依赖（只需 Node.js 内置模块）
- 启动后浏览器打开 `http://localhost:8080` 就能玩

### 原则 2：简单直接，拒绝过度设计
- 每个 JS 文件不超过 300 行
- 只有一个入口文件 `server.js`
- 不使用类继承、设计模式、依赖注入等概念
- 函数尽量短小，单一职责

### 原则 3：防御性编程，宁慢勿错
- 所有数组/列表访问前检查边界
- 所有用户输入必须校验
- 游戏循环必须有异常捕获
- 文件读取必须处理 null/不存在

---

## 四、项目结构（不可变）

```
kai-fa-522_2/
├── server.js                              # Node.js HTTP 服务器
├── package.json                           # 项目元信息
├── README.md                              # 项目说明
├── REPORT.docx                            # 实训报告（后续生成）
├── .github/workflows/ci.yml               # GitHub Actions
├── .workbuddy/rules/PROJECT-CONSTRAINTS.md  # 本文件
├── .gitignore
└── src/main/resources/web/
    ├── index.html                         # 游戏页面
    ├── css/style.css                      # 全部样式
    └── js/
        ├── game-core.js                   # [成员A] 游戏核心逻辑
        ├── scene.js                       # [成员B] Three.js 3D场景
        └── main.js                        # [成员C] 入口 + UI 绑定
```

---

## 五、3人分工与 Git 分支策略

### 成员角色定义

| 角色 | GitHub | 负责模块 | 分支 |
|------|--------|---------|------|
| 组长/成员A | jettychen / jet-isnt-haha | 项目初始化 + 游戏核心逻辑 + 服务器 + UI + 集成合并 | master / feature/game-logic / feature/server-ui |
| 成员B | cantabile-g | 3D 场景 + 多主题渲染 + 障碍物/道具 | feature/3d-render / feature/map-items |
| 成员C | funnyjacy | 单元测试 + 双人模式引擎 | feature/game-test / feature/multiplayer |

### 分支模型
- `master` — 稳定分支，只接受 PR 合并
- `feature/game-logic` — 成员A：游戏逻辑 + 地图道具引擎
- `feature/3d-render` — 成员B：3D 渲染 + 主题 + 障碍/道具
- `feature/server-ui` — 成员A：服务器 + UI
- `feature/game-test` — 成员C：单元测试
- `feature/multiplayer` — 三人协作：双人对战模式
- `feature/map-items` — 两人协作：地图/主题/道具/障碍

### Commit 规范
- 格式：`[模块] 简洁描述`
- 示例：`[game] 实现蛇的移动和碰撞检测`
- 每个功能点一个 commit，不要合并无关修改
- 代码必须先在各自分支完成，再合并到 master

---

## 六、游戏功能规格

### 基本参数
- 网格大小：可选 12x12 / 18x18 / 24x24（默认 18x18）
- 初始蛇长：3 节
- 初始方向：单人 RIGHT / 双人平行 UP
- 速度：180ms/步，每吃5个食物减10ms，最低60ms
- 每食物加分：10分（双倍道具生效时 20分）

### 功能清单（不可删减）
1. 蛇的移动控制（WASD / 方向键）
2. 蛇吃食物后增长
3. 撞墙/撞自己/撞障碍物 → 游戏结束（护盾可抵消一次）
4. 食物随机生成（不在蛇身/障碍物/道具上）
5. 分数实时显示（HUD）
6. 开始界面 + 游戏结束界面
7. 暂停/继续（空格键）
8. 重新开始
9. 3D 渲染（蛇身、食物、网格、粒子特效）
10. 单机双人对战模式（P1=WASD 绿蛇, P2=方向键 蓝蛇, 对抗淘汰制）
11. 地图大小选择（小12/中18/大24，障碍物6/10/16个）
12. 场景主题切换（暗黑/草地/沙漠/冰原，4套配色方案）
13. 道具系统（闪电加速/龟壳减速/护盾/双倍得分，每15步生成）
14. 随机障碍物方块（出生点3格安全区）

---

## 七、环境要求与启动方式

### 开发环境
- Node.js 18 或更高版本

### 运行
```bash
# 安装依赖（本项目零外部依赖，可跳过）
npm install

# 启动服务器
npm start

# 浏览器访问
open http://localhost:8080
```

---

## 八、禁止事项（AI 自检清单）

修改代码前，AI 必须逐条检查：

- [ ] 是否引入了 npm 第三方包？→ 违规
- [ ] 是否新增了 JS 文件？→ 需说明理由
- [ ] 是否引入前端框架/构建工具？→ 违规
- [ ] 代码复杂度是否不必要地增加了？→ 需简化
- [ ] 修改后 `node server.js` 能正常运行吗？→ 必须能
- [ ] 修改后游戏功能完整吗？→ 必须完整
- [ ] 是否修改了技术栈或 CDN？→ 违规

---

## 九、AI 辅助开发声明

本项目全程使用 AI 大模型（WorkBuddy / Deepseek-V4-Pro）辅助开发。
AI 负责：代码生成、架构设计、文档编写、问题排查、CI/CD 配置。
人工负责：需求决策、代码审查、测试验证、答辩展示。

---

*本文件为项目最高约束，任何人/模型修改项目前必须先阅读并理解本文件。*
