# 术语表

> 约定：中文解释 + 英文原词，第一次出现时给出英文。括号里是"本仓库的落点"。

| 术语 | 解释 | 落点 |
|---|---|---|
| **Harness** | 包在模型外面、负责工具调用、上下文、权限、恢复的那层工程代码。模型是发动机，harness 是底盘。 | 整个仓库 |
| **Agent loop** | 把"用户一句话"变成"多次模型调用 + 工具执行"的循环状态机。 | `core/agent/`（S12） |
| **Turn** | 一轮：一次用户输入到最终答复之间发生的所有事情。 | `turn/started` `/` `turn/ended` 事件 |
| **Step** | 一轮中的一步：一次模型请求，加上它请求的工具执行。 | `step/started`、`request/header` |
| **Tool call** | 模型请求执行某个工具（名字 + 原始 JSON 参数）。 | `core/tools/`、`tool/call` 事件 |
| **Tool result** | 工具执行后的结果，会作为一条 `tool` 消息回给模型。 | `tool/result` 事件 |
| **Projection** | 由事件序列计算出的视图（消息数组、TUI 转录、统计）。投影不是真相，事件才是。 | `core/session/`（S2） |
| **Event sourcing** | 只追加、不修改的事件日志；状态 = 对事件做 fold。 | `core/session/events.ts` |
| **Replay** | 从头重放事件，重建与实时一致的状态。 | S2 |
| **System prompt** | 会话开始时给模型的固定指令，包含身份、规则、工具指南。 | S13 |
| **Runtime context** | 每轮变化的少量信息（时间、git 分支、权限模式），追加在用户消息前部。 | S13 |
| **Context window** | 模型一次能接收的最大 token 数。 | `contextWindow()`（S4） |
| **Token budget** | 为输入/输出预留的额度；压缩与截断都围绕它。 | S13/S21 |
| **KV cache** | 模型对"已处理前缀"的缓存；前缀不变才能命中，命中省钱省时。 | `Usage.cachedInputTokens` |
| **Prefix stability** | 请求前缀（system + 历史）尽量不变，只追加。 | S13/S22 |
| **Compaction** | 把较早的对话区域替换成摘要，腾出上下文空间。 | `core/compaction/`（S21–S23） |
| **Spill** | 超大工具输出落盘，只把摘要与路径给模型。 | S11 |
| **Permission mode** | 三档权限：只读 / 工作区可写 / 完全放行。 | `core/permission/types.ts`（S17） |
| **Approval** | 人批准一次敏感操作；答复有 once / session / deny 三种。 | S20 |
| **Sandbox** | 限制文件与命令作用范围的机制。**v1 是策略沙箱，不是 OS 隔离**。 | S18/S19 |
| **Default deny** | 没有明确允许的，一律拒绝（fail-closed）。 | S17 |
| **Subagent** | 拥有独立上下文与独立会话的子代理，只把摘要交回父代理。 | `core/subagent/`（S24） |
| **MCP** | Model Context Protocol：把外部工具 server 接进来的协议。 | `core/mcp/`（S25/S26） |
| **STALE_FILE** | 文件在读取后被外部修改，写入前必须重读。 | S8 |
| **TOCTOU** | Time-of-check to time-of-use：检查与使用之间状态变化导致的安全问题。 | S7/S20 |
| **Fail-closed** | 出错时选择"拒绝"而不是"放行"。 | S17 |
| **Golden test** | 用固定输入比对完整输出（这里指事件序列）的测试。 | S28 |

## 容易混淆的两组

- **事件 vs 日志**：普通日志是给人看的旁白，可以丢；事件是账本，决定状态，不能丢。
- **压缩 vs 删除**：压缩是把一段历史替换成摘要，保留语义；删除会破坏"重放 == 实时"。
