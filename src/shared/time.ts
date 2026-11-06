/**
 * @file 时间工具
 * @responsibility 为事件日志、文件观测表、会话列表提供统一的 ISO 时间字符串，
 *                 避免各模块各自 `new Date().toISOString()` 造成格式漂移。
 * @invariants 输出始终是 UTC 的 ISO-8601 字符串（带毫秒与 Z 后缀），可直接排序。
 * @failureModes 无。
 * @concepts docs/concepts/event-sourcing.md
 */

/**
 * 返回当前（或指定）时间的 ISO 字符串。
 *
 * 为什么要允许传入 date？
 * 测试里需要固定时间才能断言「事件日志与重放结果逐字节一致」。
 */
export function isoNow(date: Date = new Date()): string {
  return date.toISOString();
}
