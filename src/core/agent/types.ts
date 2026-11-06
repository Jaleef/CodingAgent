/**
 * @file Agent 对 UI 的事件契约
 * @responsibility 定义内核（AgentLoop）向界面推送的"过程事件"。
 *                 它与 SessionEvent 的区别：这里包含尚未落盘的流式增量，
 *                 只用于实时渲染，不承担持久化职责。
 * @invariants
 *   1. UI 只能依赖这些事件，不得反向调用内核内部对象；
 *   2. 所有文本增量在 `text-done` 之前都可能被丢弃（例如中途取消），UI 需能处理；
 *   3. 事件本身不携带秘密内容（工具参数摘要需脱敏）。
 * @failureModes 无（纯类型）；实现见 S12/S15。
 * @concepts docs/concepts/agent-loop.md
 */

/**
 * 内核的运行状态，用于状态栏展示。
 */
export type AgentStatus = "idle" | "thinking" | "tool" | "waiting-approval";

/**
 * 内核 → UI 的事件。
 */
export type AgentEvent =
  /** 状态迁移。 */
  | { readonly type: "status"; readonly status: AgentStatus }
  /** 流式文本增量。 */
  | { readonly type: "text-delta"; readonly text: string }
  /** 当前这段文本结束（完整或被中断）。 */
  | { readonly type: "text-done"; readonly interrupted: boolean }
  /** 工具开始执行。 */
  | {
      readonly type: "tool-start";
      readonly callId: string;
      readonly name: string;
      readonly summary: string;
    }
  /** 工具执行结束。 */
  | {
      readonly type: "tool-end";
      readonly callId: string;
      readonly ok: boolean;
      readonly summary: string;
    }
  /** 需要人工审批。 */
  | {
      readonly type: "approval-request";
      readonly callId: string;
      readonly toolName: string;
      readonly summary: string;
      readonly details?: string;
    }
  /** 一轮结束。 */
  | { readonly type: "turn-ended"; readonly reason: string }
  /** 可展示给用户的错误。 */
  | { readonly type: "error"; readonly message: string; readonly code?: string };
