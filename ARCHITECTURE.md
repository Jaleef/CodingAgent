# 架构

本文只讲"骨架为什么长这样"。每一步的实现细节在其学习笔记（`docs/notes/`）与代码文件头里。

---

## 1. 分层与依赖方向

```
┌──────────────────────── CLI（args / run / exit）────────────────────────┐
│                              TUI（Ink 组件）                            │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ 只能向下依赖
┌───────────────────────────────▼─────────────────────────────────────────┐
│ core                                                                    │
│   agent  ←  session  ←  config                                          │
│     │                                                                   │
│     ├─→ context（S13） ─→ llm（S4/S5）                                   │
│     ├─→ tools（S6/S7） ─→ permission（S17） ─→ sandbox（S18/S19）        │
│     ├─→ compaction（S21–S23）                                            │
│     ├─→ subagent（S24）                                                  │
│     └─→ mcp（S25/S26）                                                   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│ shared（errors / log / ulid / time / json-schema）——不依赖任何层          │
└──────────────────────────────────────────────────────────────────────────┘
```

硬规则：

- `src/core/**` 不得 import `src/cli` 或 `src/tui`；
- `src/shared/**` 不得 import `src/core`；
- 跨模块通信优先用 `shared` 里的类型或 `core/*/types.ts` 的接口，而不是具体实现。

为什么：内核要能被 TUI、无头模式、测试、未来的 Web 服务复用。一旦 core 反向依赖 UI，
"同一个内核换界面"就不可能了。

## 2. 模块解析：为什么用 Bundler 而不是 NodeNext

`tsconfig.json` 里是：

```json
{ "module": "ESNext", "moduleResolution": "Bundler" }
```

取舍：

| 方案 | 优点 | 代价 |
|---|---|---|
| NodeNext | 直接 `node src/main.ts` 可行，最贴近原生 ESM | 每个相对导入都要写 `.js` 后缀；`tsx`/`vitest` 解析容易出岔子 |
| **Bundler（采用）** | 无后缀导入、vitest/rolldown 零配置 | 源码不能被 Node 直接加载，必须经过打包 |

本项目唯一的运行入口是 `dist/main.js`（由 rolldown 生成 ESM bundle），所以 Bundler 更合适。
代价是开发时必须用 `npm run dev`（tsx），而不是 `node src/main.ts`。

## 3. 契约索引（F0 冻结）

| 文件 | 冻结了什么 | 谁消费 |
|---|---|---|
| `src/shared/errors.ts` | 错误码 + `AgentError` + `isAgentError` | 全项目 |
| `src/shared/log.ts` | `Logger` 接口（只写 stderr） | 全项目 |
| `src/shared/ulid.ts` | `newId(prefix)` | 会话/事件/消息 id |
| `src/core/config/schema.ts` | 配置唯一真源 + `parseConfig` | CLI、内核、测试 |
| `src/core/session/events.ts` | 18 类事件的判别联合 + `NewSessionEvent` | store / 投影 / TUI |
| `src/core/session/store.ts` | `SessionStore`（append/read/flush） | agent loop、压缩、恢复 |
| `src/core/llm/types.ts` | `Message` / `ToolSchema` / `LlmDelta` / `LlmProvider` | agent loop、适配器 |
| `src/core/tools/definition.ts` | `ToolDefinition` / `ToolOutcome` / `ToolContext` | 工具实现、管线 |
| `src/core/tools/registry.ts` | `ToolRegistry`（含 schema 投影） | 循环、MCP |
| `src/core/permission/types.ts` | 三档模式、审批请求/答复 | 管线、TUI、沙箱 |
| `src/core/agent/types.ts` | `AgentEvent`（内核 → UI） | TUI、未来的 Web |
| `src/core/subagent/types.ts` | `SubagentSpec` / `SubagentResult` | subagent 工具 |
| `src/core/mcp/types.ts` | MCP 连接状态与工具描述 | MCP 管理器 |

### 为什么先冻结契约

契约是"模块之间的法律"。先冻结它，能带来三个好处：

1. 每一步只改实现，不反复改接口，减少返工；
2. 测试可以针对接口写，而不依赖内部结构；
3. 学习者可以先读懂"数据长什么样"，再看"怎么流动"。

代价是早期可能过度设计。缓解方式：契约只放**确实会被多方使用**的东西；工具实现细节
（超时、渲染、执行）一律留在定义之外。

## 4. 数据流（目标形态）

```
用户输入
  → CLI/TUI
  → AgentLoop（S12：turn/step 状态机）
      → ContextAssembler（S13：系统提示 + 历史 + runtime context）
      → LlmProvider（S4/S5：流式）
      → 若返回工具调用：
          ToolPipeline（S7：校验 → 权限 → 执行 → 截断）
          → ToolRegistry（S6：内置工具 / MCP 工具）
          → Permission + Sandbox（S17–S19）
      → 每个事实写入 SessionStore（S2/S3）
  → AgentEvent / SessionEvent 投影
  → TUI 渲染、`--json` 输出、崩溃后重放
```

关键点：**循环不持有"唯一真相"**。它只负责决策；所有事实都落成事件，投影只是事件的函数。
这样"重放 == 实时"才成立，崩溃恢复也才有依据。

## 5. 事件溯源（为什么不是普通日志）

普通 debug 日志是"给人看的旁白"，事件日志是"系统的账本"：

- 投影可重建：消息数组、token 统计、TUI 转录都从事件算出来；
- 可恢复：崩溃后重放 + 补齐未完成的调用；
- 可测试：断言事件序列比断言自然语言稳定；
- 可审计：权限决策、压缩动作都有据可查。

代价：事件 schema 必须版本化，且"写入顺序"要严格（seq 单写者）。这由 S2/S3 保证。

## 6. 扩展点

| 想扩展 | 注册到 | 步骤 |
|---|---|---|
| 新工具 | `ToolRegistry` | S6 |
| 新模型提供方 | `LlmRegistry` | S4/S5 |
| 新提示分段 | ContextAssembler 的 section 列表 | S13 |
| 新 MCP server | 配置 `mcp.servers` | S25/S26 |
| 新子代理 | `subagent` 工具 | S24 |

原则：扩展通过注册或配置完成，不为每个新能力改内核分支。

## 7. 包管理与构建

- 包管理器：**npm**（原因见 `.npmrc` 注释与 README；pnpm 12 的 store 操作锁在沙箱下无法重定向）。
- 构建：**rolldown**（进程内 N-API），单入口 ESM，依赖保持 external。
  为什么不是 tsup/esbuild：esbuild 会启动常驻子进程并通过管道通信，本机沙箱禁止
  "捕获子进程 stdout"的 spawn，tsup 在此必然失败；rolldown 不依赖子进程。
- 类型检查：`tsc --noEmit`，`strict` + `noUncheckedIndexedAccess` + `verbatimModuleSyntax`。
- 测试：**vitest**，零全局、零网络（F0）。沙箱下用 `--pool=threads`（不 fork 进程），
  并由 `scripts/sandbox-preload.mjs` 绕过 Vite 在 Windows 上的 `net use` 探测。
