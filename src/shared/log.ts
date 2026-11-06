/**
 * @file 日志
 * @responsibility 提供带级别、只写 stderr 的极简 logger。
 * @invariants
 *   1. 永不写 stdout——`--json` 模式下 stdout 只允许出现协议数据（红线：可观测性）；
 *   2. debug 级别默认关闭，只有 `--debug` 或配置 debug=true 时打开；
 *   3. 结构化字段以 JSON 追加在消息后，方便 grep，也避免格式字符串注入。
 * @failureModes 写流失败时静默（日志不能反过来打断主流程）。
 * @concepts docs/concepts/agent-loop.md
 */

/**
 * 日志级别。
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * 各模块注入的 logger 接口。
 *
 * 为什么传接口而不是全局单例？
 * 测试可以注入内存 logger 断言"报警确实发生过"，也避免模块之间共享可变状态。
 */
export interface Logger {
  debug(message: string, fields?: Readonly<Record<string, unknown>>): void;
  info(message: string, fields?: Readonly<Record<string, unknown>>): void;
  warn(message: string, fields?: Readonly<Record<string, unknown>>): void;
  error(message: string, fields?: Readonly<Record<string, unknown>>): void;
}

/**
 * logger 构造参数。
 */
export interface LoggerOptions {
  /** 是否输出 debug 级日志。 */
  readonly debug?: boolean;
  /** 输出目标，默认 process.stderr；测试可传入内存流。 */
  readonly stream?: NodeJS.WritableStream;
}

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/**
 * 创建 logger。
 *
 * 输出格式：`[ca:level] message {"key":"value"}`。
 * 之所以不是纯 JSON：人类阅读终端时更友好；需要机器解析时用会话事件日志（S2/S3）。
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const stream = options.stream ?? process.stderr;
  const minWeight = options.debug === true ? LEVEL_WEIGHT.debug : LEVEL_WEIGHT.info;

  const write = (
    level: LogLevel,
    message: string,
    fields?: Readonly<Record<string, unknown>>,
  ): void => {
    if (LEVEL_WEIGHT[level] < minWeight) return;
    const suffix = fields === undefined ? "" : ` ${safeStringify(fields)}`;
    try {
      stream.write(`[ca:${level}] ${message}${suffix}\n`);
    } catch {
      // 日志失败不能影响主流程：磁盘满、管道关闭等情况下直接丢弃这一行。
    }
  };

  return {
    debug: (message, fields) => write("debug", message, fields),
    info: (message, fields) => write("info", message, fields),
    warn: (message, fields) => write("warn", message, fields),
    error: (message, fields) => write("error", message, fields),
  };
}

/**
 * 序列化日志字段；遇到循环引用等极端情况退化为 String()。
 */
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
