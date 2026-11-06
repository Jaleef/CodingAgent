/**
 * @file 统一错误类型与错误码
 * @responsibility 把"可预期的失败"（配置非法、工具被拒、超时、取消…）收敛成带稳定
 *                 错误码的 AgentError，让上层（agent loop / TUI / 测试）可以按码分支，
 *                 而不是靠解析错误消息。
 * @invariants
 *   1. 每个抛出的 AgentError 都携带 `code`，且 code 出自 ErrorCode 联合类型；
 *   2. `retryable` 只描述"重试是否有意义"，不代表重试策略（策略在 S4/S21 决定）；
 *   3. 错误消息是给人看的，程序分支必须看 `code`。
 * @failureModes 无（构造错误不会失败）；未知异常用 `toErrorMessage` 兜底。
 * @concepts docs/concepts/tool-contract.md
 */

/**
 * 全项目共享的错误码。
 *
 * 命名规则：`<领域>_<问题>`，一旦发布就视为契约的一部分——
 * 测试和未来的 UI 会依赖它，因此新增码可以、改码需要走契约变更流程。
 */
export type ErrorCode =
  | "INVALID_CONFIG"
  | "INVALID_ARGUMENTS"
  | "NOT_IMPLEMENTED"
  | "UNKNOWN_TOOL"
  | "DENIED"
  | "APPROVAL_TIMEOUT"
  | "ABORTED"
  | "TOOL_TIMEOUT"
  | "STALE_FILE"
  | "EXEC_FAILED"
  | "PROVIDER_ERROR"
  | "NO_CREDENTIALS"
  | "NO_ADAPTER"
  | "SESSION_LOCKED"
  | "SESSION_CORRUPT"
  | "IO_ERROR";

/**
 * AgentError 的可选字段。
 */
export interface AgentErrorOptions {
  /** 同样的请求重试一次是否可能成功（限流可重试，参数非法不可重试）。 */
  readonly retryable?: boolean;
  /** 结构化上下文，仅用于日志/调试，不直接展示给模型。 */
  readonly details?: Readonly<Record<string, unknown>>;
  /** 原始异常，保留堆栈便于定位。 */
  readonly cause?: unknown;
}

/**
 * 本项目的"预期内失败"。
 *
 * 为什么不用一个巨大的 Error 子类树？
 * 错误码联合类型 + 一个类，避免了 instanceof 地狱；调用方用 `switch (err.code)`
 * 就能穷尽处理，而 `isAgentError` 负责把任意 throw 值收窄。
 */
export class AgentError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(code: ErrorCode, message: string, options: AgentErrorOptions = {}) {
    // 原生 Error 的 cause 会在 Node 的 console/堆栈中保留原始异常链。
    super(message, { cause: options.cause });
    this.name = "AgentError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.details = options.details;
  }
}

/**
 * 类型守卫：把 `catch (e)` 拿到的 unknown 收窄为 AgentError。
 *
 * 注意：跨 realm（例如 worker_threads）时 instanceof 可能失效，
 * 本项目单进程运行，暂不需要更复杂的鸭式判断。
 */
export function isAgentError(value: unknown): value is AgentError {
  return value instanceof AgentError;
}

/**
 * 把任意抛出值转成可读消息。
 *
 * 用于日志与"未知异常"兜底；不要用它做程序分支（分支请用错误码）。
 */
export function toErrorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
