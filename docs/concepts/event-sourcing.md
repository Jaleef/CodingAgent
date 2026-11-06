# 事件溯源

## 一句话

只追加、不修改的事件日志是唯一真相；消息历史、UI 转录、统计都是对事件做 fold 得到的**投影**。

## 为什么不用普通日志

普通 debug 日志是"给人看的旁白"：可以丢、可以改格式、不影响系统状态。
事件日志是"系统的账本"：决定状态，丢了就无法恢复。

有了它，下面这些能力才成立：

| 能力 | 依赖 |
|---|---|
| 崩溃恢复 | 重放事件，补齐未完成的 turn |
| 审计 | 权限决策、压缩动作都有记录 |
| 确定性测试 | 断言事件序列，而不是自然语言 |
| 多视图 | TUI、`--json`、未来 Web 共用一份事实 |
| 分叉/回放 | 从任意 seq 重建状态 |

## 事件 vs 状态

```
事件流：session/created → turn/started → step/started → message/assistant → tool/call → tool/result → …
投影：  messages[]、transcript[]、usage、当前 turn 状态
```

不变量：`project(replay(events)) === project(live)`。
S2 会用 golden 测试守住这条。

## 三条硬规则

1. **不可变**：纠正靠追加新事件，不改旧行。
2. **单写者**：seq 只能由 store 分配；调用方构造 `NewSessionEvent`（不含 seq）。
3. **版本化**：信封有 `v`；新增事件类型是兼容变更，改已有 data 形状是破坏变更。

## 崩溃后会看到什么

日志尾部可能只有半行（写到一半被杀）。读取时要：

1. 截断到最后一条完整行；
2. 若最后一个 `turn/started` 没有 `turn/ended`，补一条 `interrupted`；
3. 为"有 call 无 result"的 toolCallId 补 `NOT_EXECUTED`。

第 3 步是 API 合法性的关键：assistant 的每个 toolCall 最终都必须有对应的 tool 消息。

## 压缩如何不破坏事件溯源

压缩不是"删掉旧事件"，而是追加一条 `compaction/committed`，声明"用摘要替换 [from, to) 区间"。
投影时应用这条规则，原始事件仍然在日志里。

## 本仓库落点

| 内容 | 位置 | 步骤 |
|---|---|---|
| 18 类事件与信封 | `src/core/session/events.ts` | F0 |
| 存储接口 | `src/core/session/store.ts` | F0 |
| 内存 store / 投影 / 重放 | `src/core/session/` | S2 |
| JSONL 持久化 / 锁 / 修复 | `src/core/session/` | S3 |

## 带着这些问题读

1. 为什么事件不能修改？如果写错了怎么办？
2. seq 为什么必须由单一写入者分配？
3. 未知事件类型（未来版本新增）应该报错还是忽略？
4. 压缩后，重放如何知道"这段历史被摘要替换了"？

## 常见误解

- **"事件日志就是 debug log"**：一个是账本，一个是旁白。
- **"状态存两份没坏处"**：两份状态早晚不一致；只存事件，其余都算。
- **"重放很慢，不如存快照"**：快照是优化，不是真相；先保证正确，再谈性能。
