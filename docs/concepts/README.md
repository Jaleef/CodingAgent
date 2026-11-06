# 概念索引

每个概念一页，回答四件事：**是什么 → 为什么需要 → 本仓库怎么落 → 读的时候带着什么问题**。

正文随对应步骤逐步加深；F0 先给出框架与落点，避免"空壳文档"。

| 概念 | 文档 | 对应步骤 | 一句话 |
|---|---|---|---|
| Agent 循环 | [agent-loop.md](agent-loop.md) | S12 | 把一次输入变成多步"模型 + 工具"的状态机 |
| 工具契约 | [tool-contract.md](tool-contract.md) | S6/S7 | 模型只看名字、描述、schema；其余都是内部实现 |
| 事件溯源 | [event-sourcing.md](event-sourcing.md) | S2/S3 | 状态是事件的投影，日志才是真相 |
| 上下文与 KV cache | [context-and-kv-cache.md](context-and-kv-cache.md) | S13/S21 | 前缀稳定才能命中缓存；易变信息只追加 |
| 权限与沙箱 | [permission-and-sandbox.md](permission-and-sandbox.md) | S17–S20 | 默认拒绝；v1 是策略沙箱，不是 OS 隔离 |
| 压缩 | [compaction.md](compaction.md) | S21–S23 | 用摘要替换旧区域，而不是删除历史 |
| 子代理 | [subagent.md](subagent.md) | S24 | 独立上下文干活，只把摘要带回来 |
| MCP | [mcp.md](mcp.md) | S25/S26 | 用标准协议接入外部工具 server |

## 怎么用这些文档

- **开工前**：先读该步的概念页，建立"为什么"。
- **写代码时**：把 `@concepts` 链接指回这里，让代码与概念互相可追。
- **完成后**：在 `docs/notes/<ID>-*.md` 里补"这次实际怎么落的、和预期差在哪"。

概念页不是教程，不追求面面俱到；它只负责让"设计取舍"有地方落脚。
