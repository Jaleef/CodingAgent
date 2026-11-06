# Coding Agent（学习导向的 harness 复刻）

从零实现一个 coding agent 内核：不只是"能改代码的 CLI"，而是把当下 coding agent
harness 的工程约束逐条拆开、写清、测到。

> 当前状态：**F0 骨架**。契约、构建链、TUI 静态壳与学习文档就位；模型与工具尚未接入。
> 进度与下一步见 [STEPS.md](STEPS.md)。

---

## 这是什么

一个本地优先、事件溯源、默认拒绝的 coding agent。目标不是最快做出 demo，而是让每个
设计决定都能回答三个问题：

1. 它解决 harness 的哪个具体问题？
2. 为什么不用另一种做法？
3. 怎么证明它真的成立（测试/事件/指标）？

因此这个仓库里：

- **注释是交付物**：文件头写职责/不变量/失败模式，导出符号有 JSDoc，关键算法写取舍；
- **每一步都有一篇学习笔记**（`docs/notes/`），回答"问题/概念/取舍/验证"；
- **测试即教学**：每条红线至少有一个用例，测试名描述行为而不是函数名。

## 快速开始

```powershell
npm install
npm run build
node dist/main.js --version   # 0.1.0
npm run dev                   # 构建后用 Node 运行（沙箱兼容）
```

`ca` 是 bin 名。构建后也可以 `node dist/main.js` 打开 TUI（F0 只有一个静态壳）。

> 为什么是 npm 而不是 pnpm？本机沙箱禁止写 `%LOCALAPPDATA%`，而 pnpm 12 的 store
> 操作锁固定建在那里且无法重定向；npm 的 cache 可以通过 [.npmrc](.npmrc) 放进仓库。
> 若你在不受限的环境，可以删掉 `.npmrc` 与 `node_modules` 后改回 pnpm。

## 学习路线

1. 读 [docs/00-reading-guide.md](docs/00-reading-guide.md)：三种读法 + 每一步对应哪个概念。
2. 读 [ARCHITECTURE.md](ARCHITECTURE.md)：分层、依赖方向、契约索引。
3. 打开 [STEPS.md](STEPS.md)，从下一步开始：先读对应概念文档，再看代码与测试。
4. 每完成一步，读 [docs/notes/](docs/notes/) 里那篇笔记，用自己的话复述一遍。

## 当前能力（F0）

| 能力 | 状态 |
|---|---|
| CLI 参数解析（`--cwd/--model/--permission/...`） | 已解析；仅 `--help/--version` 生效 |
| TUI（Ink） | 静态壳：可输入、`/help`、`/clear`、`/exit` |
| 配置 schema（zod） | 已冻结，含默认值与严格校验；文件加载在 S1 |
| 消息 / 工具 / 事件 / provider 契约 | 已冻结 |
| 内核（turn/step、工具、权限、压缩、子代理、MCP） | 未接入 |

## 仓库结构

```
src/
├─ main.ts              入口
├─ cli/                 参数解析、启动流程、退出码
├─ tui/                 Ink 组件与主题
├─ core/
│  ├─ agent/            AgentEvent（内核 → UI）
│  ├─ config/           zod 配置 schema 与默认值
│  ├─ session/          事件信封与存储接口
│  ├─ llm/              消息模型、流式增量、provider 接口
│  ├─ tools/            工具定义与注册表接口
│  ├─ permission/       权限模式与审批契约
│  ├─ subagent/         子代理契约
│  └─ mcp/              MCP 运行期类型
└─ shared/              错误码、日志、id、时间、JSON Schema 类型
tests/                   单元测试（后续加集成/E2E）
docs/                    学习文档：阅读路线、术语、概念、每步笔记
scripts/check-docs.mjs    注释/文档结构校验
```

依赖方向是硬的：`cli → core`、`tui → core`，`core` 不得反向依赖；`shared` 不依赖任何层。

## 常用命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 构建后用 Node 运行（沙箱内唯一可行的启动方式） |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint（flat config） |
| `npm test` | Vitest 单元测试（线程池 + 沙箱预加载） |
| `npm run check:docs` | 校验文件头、`@concepts` 链接、导出 JSDoc、步骤笔记 |
| `npm run build` | rolldown 打包到 `dist/main.js` |
| `npm run verify` | 依次跑上面所有门禁 |

## 不做什么（v1 非目标）

计划模式、Web/桌面 GUI、IDE 插件、多用户、OS 级沙箱、语义代码索引、语音、i18n。
这些不是"永远不会做"，而是先把内核做对。

## 安全

F0 还没有执行能力，安全问题从 S7 起逐步出现。目标模型、边界与已知限制见
[SECURITY.md](SECURITY.md)——尤其是：**v1 是策略沙箱，不是操作系统级隔离**。
