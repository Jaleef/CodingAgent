# 阅读路线

这个仓库是"边做边学"的：代码、测试、文档是同一件事的三个面。下面给三种读法，
按你当前的目标选一种即可。

---

## 读法 A：跟着步骤走（推荐）

适合"我想亲手实现一个 agent"。

1. 打开 [STEPS.md](../STEPS.md)，看当前进度。
2. 读该步对应的**概念文档**（`docs/concepts/`），先建立直觉。
3. 读该步涉及的**类型与接口**（通常在 `src/core/*/types.ts`），弄清数据形状。
4. 看实现与测试；重点读文件头、导出 JSDoc、以及"为什么"注释。
5. 合上代码，用自己的话回答笔记模板的四个问题，再对照 `docs/notes/`。

## 读法 B：按概念走

适合"我已经写过 agent，想看看这里的取舍"。

| 概念 | 文档 | 对应步骤 |
|---|---|---|
| agent loop / turn / step | [concepts/agent-loop.md](concepts/agent-loop.md) | S12 |
| 工具契约与投影 | [concepts/tool-contract.md](concepts/tool-contract.md) | S6/S7 |
| 事件溯源与重放 | [concepts/event-sourcing.md](concepts/event-sourcing.md) | S2/S3 |
| 上下文窗口与 KV cache | [concepts/context-and-kv-cache.md](concepts/context-and-kv-cache.md) | S13/S21 |
| 权限与沙箱 | [concepts/permission-and-sandbox.md](concepts/permission-and-sandbox.md) | S17–S20 |
| 压缩 | [concepts/compaction.md](concepts/compaction.md) | S21–S23 |
| 子代理 | [concepts/subagent.md](concepts/subagent.md) | S24 |
| MCP | [concepts/mcp.md](concepts/mcp.md) | S25/S26 |

## 读法 C：按一次请求的数据流走

适合"我想知道一行输入到最后发生了什么"。

```
CLI/TUI → AgentLoop → ContextAssembler → LlmProvider → ToolPipeline → SessionStore → 投影 → TUI
```

沿着 [ARCHITECTURE.md](../ARCHITECTURE.md) 第 4 节的数据流图，逐个文件读下去。
F0 阶段这条链还没有接上，可以先读类型，等 S12 之后回来走一遍。

---

## 怎么读一个文件

每个源码文件都遵守同一套结构（见 [comment-style.md](comment-style.md)）：

1. **文件头**：`@responsibility` 告诉我它负责什么，`@invariants` 告诉我不能违反什么，
   `@failureModes` 告诉我出错时长什么样，`@concepts` 指向该读的概念文档。
2. **导出符号的 JSDoc**：为什么存在、参数/返回值、会抛什么错。
3. **正文注释**：关键算法的分段说明，以及"为什么不是另一种做法"。

如果某段代码只有"做了什么"的注释，没有"为什么"，那是一个应该被修掉的缺陷。

## 怎么记笔记

每步完成后写 `docs/notes/<ID>-<slug>.md`，只回答四个问题：

1. **解决什么问题**：这一步补上了哪个缺口？
2. **涉及哪些概念**：用到的 harness 概念，一句话解释。
3. **有什么取舍**：至少写一个被否决的方案及原因。
4. **怎么验证**：跑了什么命令、看到什么现象、哪条红线被覆盖。

模板见 [notes/_template.md](notes/_template.md)，示例见 [notes/F00-skeleton.md](notes/F00-skeleton.md)。

## 常见误区

- **把注释当装饰**：这里注释是交付物，`npm run check:docs` 会卡结构。
- **跳过测试读实现**：测试是"行为规格"，往往比实现更容易读懂。
- **一次读很多步**：每步都依赖前一步的上下文；跳读容易把契约当成"随便定的"。
- **只看成功路径**：每个模块的 `@failureModes` 才是 harness 工程的真正难点。
