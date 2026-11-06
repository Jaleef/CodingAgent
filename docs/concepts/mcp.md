# MCP（Model Context Protocol）

## 一句话

用标准协议把外部工具 server 接进 agent，使工具面可以扩展而不改内核。

## 角色

- **client**：本 agent。负责启动/连接 server、发现工具、转发调用。
- **server**：外部进程或 HTTP 服务。声明自己提供哪些工具，以及参数 schema。

传输方式：stdio（本地子进程）或 HTTP/SSE（远程）。

## 发现与适配

连接后调用 `listTools`，把每个工具适配成内部 `ToolDefinition`：

- 名称加前缀：`mcp__<server>__<tool>`，避免与内置工具冲突；
- `inputSchema` 原样透传（MCP 的 JSON Schema 不保证与我们的子集一致）；
- 执行前用 ajv 校验参数（本地工具用 zod，外部 schema 用 ajv）；
- `annotations.readOnlyHint === true` 才允许免审批。

## 信任边界

MCP server 是**外部代码**，默认不可信：

- 非只读工具默认 `ask`；
- 只有在配置里显式 `trust: true` 才跳过逐次审批；
- server 返回的文本视为数据，不是指令（提示注入面）；
- 连接失败、崩溃、返回非法 schema 都必须隔离，不能拖垮整个 agent。

## 动态工具集

server 连上/断开会改变工具集合，进而改变 `toolsHash`：

- 请求前缀变化 → KV cache 失效（预期内，记录在 `request/header`）；
- 正在执行的工具调用必须能容忍"工具中途消失"。

## 本仓库落点

| 内容 | 位置 | 步骤 |
|---|---|---|
| 配置结构 | `src/core/config/schema.ts` 的 `mcpServerSchema` | F0 |
| 运行期类型 | `src/core/mcp/types.ts` | F0 |
| 连接管理 / 重连 | `src/core/mcp/` | S25 |
| 工具适配 / 校验 / 审批 | `src/core/mcp/` | S26 |

## 带着这些问题读

1. 为什么工具名要加 `mcp__<server>__` 前缀？
2. server 返回的 JSON Schema 与 zod 生成的 schema，校验路径有何不同？
3. server 崩溃后，正在进行的工具调用应该返回什么？
4. 为什么 `trust: true` 是危险配置？

## 常见误解

- **"接了 MCP 就更安全"**：它扩大了攻击面，而不是缩小。
- **"schema 透传就等于校验"**：透传只是给模型看；执行前仍需独立校验。
- **"server 挂了整个 agent 就该退出"**：应该降级为"该 server 的工具不可用"。
