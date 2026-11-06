/**
 * @file 工具定义契约
 * @responsibility 定义工具在内核中的形状：元数据、单一 schema 真源、执行函数，
 *                 以及执行结果的统一表示。
 * @invariants
 *   1. `input`（zod schema）是唯一真源：既用于生成模型可见的 JSON Schema（S6），
 *      也用于校验模型入参（S7），两者不允许各写一份；
 *   2. `execute` 必须观察 `ctx.signal`，被取消时尽快返回（协作式取消）；
 *   3. 失败用 ToolOutcome（isError=true）表达，而不是 throw——让模型能看到错误并自我修正；
 *   4. `render` 仅用于 UI，永远不进入模型上下文（红线：模型面只是投影）。
 * @failureModes 见 ToolErrorCode；实现方如果 throw，管线会把它转成 EXEC_FAILED。
 * @concepts docs/concepts/tool-contract.md
 */

import type { ZodType } from "zod";

import type { ContentBlock } from "../llm/types";
import type { PermissionApi } from "../permission/types";
import type { SubagentResult, SubagentSpec } from "../subagent/types";
import type { Logger } from "../../shared/log";

/**
 * 工具失败的稳定错误码。
 *
 * 这些码会随 tool/result 事件落盘，也会回给模型（作为可读的错误消息前缀），
 * 因此改动需要保持向后兼容。
 */
export type ToolErrorCode =
  | "UNKNOWN_TOOL"
  | "INVALID_ARGUMENTS"
  | "DENIED"
  | "APPROVAL_TIMEOUT"
  | "ABORTED"
  | "TOOL_TIMEOUT"
  | "STALE_FILE"
  | "EXEC_FAILED";

/**
 * 工具产物。
 *
 * `content` 是唯一会进入模型上下文的部分；`display` 与 `meta` 只服务 UI/日志。
 */
export interface ToolOutcome {
  readonly content: readonly ContentBlock[];
  /** true 表示这是一次"预期内的失败"，模型应据此调整策略。 */
  readonly isError?: boolean;
  /** 错误码，仅在 isError 时有意义。 */
  readonly errorCode?: ToolErrorCode;
  /** 面向 UI 的展示数据（例如 diff、文件卡片），不会下发给模型。 */
  readonly display?: ToolDisplay;
  /** 执行元数据，用于日志与 UI 状态。 */
  readonly meta?: ToolMeta;
}

/**
 * 工具卡片渲染所需的最小数据。
 *
 * 用 `kind` 做判别，各工具自行扩展字段；UI 对未知 kind 应降级为纯文本展示。
 */
export interface ToolDisplay {
  readonly kind: string;
  readonly [key: string]: unknown;
}

/**
 * 执行元数据。
 */
export interface ToolMeta {
  readonly durationMs?: number;
  readonly exitCode?: number;
  readonly spillPath?: string;
}

/**
 * 工具运行期上下文。
 *
 * 只暴露"工具确实需要"的能力：取消信号、权限询问、日志、派生子代理。
 * 工具拿不到 session store、provider、TUI——依赖面越小，越容易测试与推理。
 */
export interface ToolContext {
  readonly sessionId: string;
  readonly cwd: string;
  /** 协作式取消信号；必须在长循环/子进程等待中检查。 */
  readonly signal: AbortSignal;
  readonly permission: PermissionApi;
  readonly log: Logger;
  /** 仅 subagent 工具会用到；其他工具应忽略。 */
  readonly spawnSubagent?: (spec: SubagentSpec) => Promise<SubagentResult>;
}

/**
 * 一个工具的完整定义（内部形状，不是模型看到的形状）。
 */
export interface ToolDefinition<I = unknown> {
  /** 稳定标识，模型按此名调用；一旦发布不应重命名。 */
  readonly name: string;
  /** 给模型看的能力说明，直接影响调用准确率。 */
  readonly description: string;
  /** 参数 schema 的唯一真源。 */
  readonly input: ZodType<I>;
  /** 只读工具可以免审批，并在 read-only 模式下可用。 */
  readonly readOnly: boolean;
  /** 同一批调用里是否可以与相邻工具并行执行。 */
  readonly concurrencySafe: boolean;
  /** 覆盖全局 toolTimeoutMs；不传则用配置值。 */
  readonly timeoutMs?: number;
  /** 覆盖全局 maxToolOutputBytes；不传则用配置值。 */
  readonly maxResultBytes?: number;
  /** 执行体；必须观察 ctx.signal。 */
  execute(input: I, ctx: ToolContext): Promise<ToolOutcome>;
  /** UI 渲染；仅在已有 outcome 时可拿到结果。 */
  render?(input: I, outcome?: ToolOutcome): ToolDisplay;
}
