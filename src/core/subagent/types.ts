/**
 * @file 子代理类型契约
 * @responsibility 定义父代理派生子代理时交换的最小信息：任务、工具白名单、预算，
 *                 以及只把"摘要"带回父上下文的结果形状。
 * @invariants
 *   1. 子代理拥有独立 session 与独立上下文，父会话只接收摘要（红线：上下文隔离）；
 *   2. v1 深度上限为 1（子代理不能再派生子代理）；
 *   3. 子代理必须可以被子代理的父级取消（取消级联）。
 * @failureModes 超时/取消/失败都通过 status 表达，而不是抛异常穿透父循环。
 * @concepts docs/concepts/subagent.md
 */

import type { Usage } from "../llm/types";

/**
 * 派生子代理的请求。
 */
export interface SubagentSpec {
  /** 一句话说明，用于父会话事件与 UI 标签。 */
  readonly description: string;
  /** 交给子代理的完整任务描述（它看不到父对话）。 */
  readonly prompt: string;
  /** 子代理可用的工具白名单；缺省表示继承父代理工具集（但去掉 subagent 自身）。 */
  readonly tools?: readonly string[];
  /** 覆盖模型；缺省沿用配置或父代理模型。 */
  readonly model?: string;
  /** 子代理的最大步数，缺省取主配置。 */
  readonly maxSteps?: number;
}

/**
 * 子代理的最终状态。
 */
export type SubagentStatus = "completed" | "failed" | "cancelled" | "timeout";

/**
 * 子代理返回给父代理的结果。
 *
 * 只有 `summary` 会进入父会话的 tool 消息；`sessionId` 与 `usage` 用于审计与成本核算。
 */
export interface SubagentResult {
  readonly status: SubagentStatus;
  readonly summary: string;
  readonly sessionId: string;
  readonly usage?: Usage;
}
