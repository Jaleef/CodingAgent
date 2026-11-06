# 上下文窗口与 KV cache

## 一句话

模型一次能看的 token 有限；请求的**前缀越稳定**，provider 越可能命中 KV cache，
省钱、省时，也让长会话更可行。

## 上下文窗口

每次请求都是"system + 历史消息 + 工具 schema"一起塞进去。窗口满了会怎样？

- 轻则报 context overflow；
- 重则模型开始遗忘早期指令（即使没报错）。

所以 harness 必须主动管理：估算 token、压缩、截断、spill 大输出。

## KV cache 与"前缀"

模型推理时，已处理过的 token 的键值对可以复用。复用条件是**前缀完全相同**。

这意味着两个反直觉的结论：

1. 在 system prompt 里写当前时间 → 每秒都不同 → 缓存全失效；
2. 工具列表顺序变化 → 前缀变了 → 缓存失效，即使工具集合没变。

所以本仓库的规则是：

- system prompt 会话内**不变**；
- 工具 schema 按名称排序后注入；
- 易变信息（时间、git 状态）作为**本轮用户消息的前部**追加，只增不改；
- 压缩是"区域替换"，替换点之前的字节保持不变。

## 怎么观察缓存是否命中

provider 返回的 `usage.cachedInputTokens` 是唯一客观指标（见 `src/core/llm/types.ts` 的 `Usage`）。
S21 会用它校准 token 估算；如果缓存命中率长期为 0，先检查前缀是不是被改动了。

## 本仓库落点

| 内容 | 位置 | 步骤 |
|---|---|---|
| 消息 / 用量类型 | `src/core/llm/types.ts` | F0 |
| 上下文装配 | `src/core/context/` | S13 |
| token 估算与计量 | `src/core/context/tokens.ts` | S21 |
| 压缩 | `src/core/compaction/` | S22 |

## 带着这些问题读

1. 为什么 runtime context 不能塞进 system prompt？
2. 工具集合变化（MCP 连上/断开）对缓存意味着什么？
3. token 估算为什么不能用"字符数 / 4"一刀切？
4. 压缩后 prefix 真的没变吗？替换点在哪？

## 常见误解

- **"缓存是 provider 自动的，不用管"**：provider 只负责算，前缀由你决定。
- **"把时间写进 system prompt 更方便"**：方便一次，贵一整天。
- **"压缩 = 删除最早的消息"**：删除会破坏前缀与重放；替换成摘要才是正确做法。
