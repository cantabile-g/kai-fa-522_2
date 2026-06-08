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
构建工具:  Maven (Java 8, 零外部依赖)
服务端:    JDK 内置 com.sun.net.httpserver.HttpServer
前端:      HTML5 + CSS3 + JavaScript (ES Module)
3D引擎:    Three.js r160 (CDN: jsdelivr.net)
CDN白名单: cdnjs.cloudflare.com / cdn.jsdelivr.net / unpkg.com
```

**绝对禁止：**
- ❌ 引入任何第三方 Java 依赖（Spring Boot / Jetty / Netty 等）
- ❌ 使用 npm / webpack / vite 等前端构建工具
- ❌ 使用 TypeScript 或任何编译到 JS 的语言
- ❌ 修改 Three.js 版本或更换 CDN 来源
- ❌ 引入任何后端数据库或文件存储

---

## 三、代码设计最高原则

### 原则 1：一切以能运行为最高目标
- 代码写完必须能直接运行，零配置，零环境依赖（只需 JDK 8+）
- 任何一个 class 在主分支上都必须能成功编译
- `mvn compile` 和 `mvn test` 必须全部通过

### 原则 2：简单直接，拒绝过度设计
- 每个 Java 类不超过 150 行
- 每个 JS 文件不超过 250 行
- 不使用设计模式、抽象工厂、IoC 容器等概念
- 不使用多线程、异步编程、Stream API 等复杂特性
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
├── pom.xml                              # Maven 配置
├── README.md                            # 项目说明
├── REPORT.docx                          # 实训报告（后续生成）
├── .github/workflows/ci.yml             # GitHub Actions
├── .workbuddy/rules/PROJECT-CONSTRAINTS.md  # 本文件
├── src/
│   ├── main/java/cn/edu/whut/sept/
│   │   └── GameServer.java              # HTTP 服务器（唯一 Java 类）
│   ├── main/resources/web/
│   │   ├── index.html                   # 游戏页面
│   │   ├── css/style.css                # 全部样式
│   │   └── js/
│   │       ├── game-core.js             # [成员A] 游戏核心逻辑
│   │       ├── scene.js                 # [成员B] Three.js 3D场景
│   │       └── main.js                  # [成员C] 入口 + UI 绑定
│   └── test/java/cn/edu/whut/sept/
│       └── GameServerTest.java          # 服务器单元测试
```

---

## 五、3人分工与 Git 分支策略

### 成员角色定义

| 角色 | 姓名 | 负责模块 | 分支 |
|------|------|---------|------|
| 组长/成员A | 待定 | 项目初始化 + 游戏核心逻辑 + 集成合并 | main / feature/game-logic |
| 成员B | 待定 | Three.js 3D 场景搭建与渲染 | feature/3d-render |
| 成员C | 待定 | HTTP 服务器 + UI界面 + CI/CD + README | feature/server-ui |

### 分支模型
- `main` — 稳定分支，只接受 PR 合并
- `feature/game-logic` — 成员A：游戏逻辑
- `feature/3d-render` — 成员B：3D 渲染
- `feature/server-ui` — 成员C：服务器 + UI

### Commit 规范
- 格式：`[模块] 简洁描述`
- 示例：`[game] 实现蛇的移动和碰撞检测`
- 每个功能点一个 commit，不要合并无关修改
- 代码必须先在各自分支完成，再合并到 main

---

## 六、游戏功能规格

### 基本参数
- 网格大小：18x18
- 初始蛇长：3 节
- 初始方向：RIGHT（向右）
- 速度：180ms/步，每吃5个食物减10ms，最低60ms
- 每食物加分：10分

### 功能清单（不可删减）
1. 蛇的移动控制（WASD / 方向键）
2. 蛇吃食物后增长
3. 撞墙/撞自己 → 游戏结束
4. 食物随机生成（不在蛇身上）
5. 分数实时显示（HUD）
6. 开始界面 + 游戏结束界面
7. 暂停/继续（空格键）
8. 重新开始
9. 3D 渲染（蛇身、食物、网格、粒子特效）

---

## 七、环境要求与启动方式

### 开发环境
- JDK 8+
- Maven 3.6+

### 编译与运行
```bash
# 编译
mvn clean compile

# 运行服务器
mvn exec:java -Dexec.mainClass="cn.edu.whut.sept.GameServer"

# 浏览器访问
open http://localhost:8080
```

### 打包
```bash
mvn package  # 生成 target/snake3d.jar
```

---

## 八、禁止事项（AI 自检清单）

修改代码前，AI 必须逐条检查：

- [ ] 是否引入了新的外部依赖？→ 违规
- [ ] 是否使用了 Java 8 不支持的特性？→ 违规
- [ ] 是否创建了除 GameServer.java 以外的新 Java 类？→ 需说明理由
- [ ] 是否引入了新的 JS 文件？→ 需说明理由
- [ ] 代码复杂度是否不必要地增加了？→ 需简化
- [ ] 修改后 mvn compile 能通过吗？→ 必须通过
- [ ] 修改后游戏能正常运行吗？→ 必须能
- [ ] 是否修改了技术栈？→ 违规

---

## 九、AI 辅助开发声明

本项目全程使用 AI 大模型（WorkBuddy / Deepseek-V4-Pro）辅助开发。
AI 负责：代码生成、架构设计、文档编写、问题排查、CI/CD 配置。
人工负责：需求决策、代码审查、测试验证、答辩展示。

---

*本文件为项目最高约束，任何人/模型修改项目前必须先阅读并理解本文件。*
