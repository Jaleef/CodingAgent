/**
 * @file 标识符生成
 * @responsibility 生成带类型前缀、可按时间排序、冲突概率足够低的 id，
 *                 用于会话（sess_）、事件（evt_）、工具调用（call_）等。
 * @invariants 同一个进程内不保证严格单调（可能是同一毫秒），但时间前缀保证
 *             跨进程大致有序；随机段长度足以让碰撞概率可忽略。
 * @failureModes 无（随机源来自 node:crypto，不会返回可预测的伪随机数）。
 * @concepts docs/concepts/event-sourcing.md
 */

import { randomBytes } from "node:crypto";

/**
 * Crockford Base32 字母表：去掉了 I/L/O/U，避免人工抄写时混淆。
 */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * 把毫秒时间戳编码成 10 位 Base32 字符串（ULID 的时间段规则）。
 */
function encodeTime(timestampMs: number): string {
  let remaining = timestampMs;
  let out = "";
  for (let i = 0; i < 10; i += 1) {
    // 注意：这里用取模取低位，所以是从后往前拼，保证结果长度固定为 10。
    const digit = remaining % 32;
    out = (CROCKFORD[digit] ?? "0") + out;
    remaining = Math.floor(remaining / 32);
  }
  return out;
}

/**
 * 生成 16 位随机 Base32 字符串。
 *
 * 说明：对 256 取模会带来极轻微的分布偏差，但对 id 的唯一性没有实际影响；
 * 这是为了"零依赖实现 ULID 风格 id"而做的取舍，真要严格等概率得用拒绝采样。
 */
function encodeRandom(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (const byte of bytes) {
    out += CROCKFORD[byte % 32] ?? "0";
  }
  return out;
}

/**
 * 生成 `prefix_<ulid>` 形式的 id，例如 `sess_01J9Z…`。
 *
 * 这不是严格 ULID 规范实现（没有同毫秒单调递增保证），
 * 但满足本项目"可排序 + 低碰撞 + 可读前缀"三件事。
 */
export function newId(prefix: string, timestampMs: number = Date.now()): string {
  return `${prefix}_${encodeTime(timestampMs)}${encodeRandom(16)}`;
}
