/**
 * @file MCP 运行期类型契约
 * @responsibility 定义 MCP server 连接状态与"发现到的工具"的描述形状。
 *                 配置结构复用 config/schema.ts 里的 McpServerConfig，避免两处漂移。
 * @invariants
 *   1. 工具名在注册进 ToolRegistry 前必须加 `mcp__<server>__` 前缀，防止与内置工具冲突；
 *   2. `inputSchema` 原样透传（MCP 的 JSON Schema 不保证与我们的子集一致，校验在 S26）；
 *   3. 连接状态是 UI 可见的，但工具可用性以 ToolRegistry 的实际内容为准。
 * @failureModes 连接失败不得让进程崩溃，只能标记 server 不可用（S25 的退避重连）。
 * @concepts docs/concepts/mcp.md
 */

import type { McpServerConfig } from "../config/schema";

/**
 * MCP server 的连接状态。
 */
export type McpConnectionState = "connecting" | "ready" | "degraded" | "closed";

/**
 * 从 MCP server 发现到的一个工具。
 */
export interface McpToolDescriptor {
  /** server 内的原始工具名（未加前缀）。 */
  readonly name: string;
  readonly description: string;
  /** 原始 JSON Schema，透传给模型；执行前需额外校验（S26）。 */
  readonly inputSchema: Readonly<Record<string, unknown>>;
  /** MCP 的只读提示；为 true 时可免审批。 */
  readonly readOnly: boolean;
}

/**
 * 一个已配置的 MCP server 的运行期视图。
 */
export interface McpServerRuntime {
  readonly name: string;
  readonly config: McpServerConfig;
  readonly state: McpConnectionState;
  readonly tools: readonly McpToolDescriptor[];
}
