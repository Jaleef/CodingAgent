/**
 * @file 会话存储接口
 * @responsibility 定义"唯一写入者"的契约：追加事件、分配 seq、读回事件、落盘屏障。
 *                 内存实现见 S2，JSONL 持久化见 S3。
 * @invariants
 *   1. `append` 是唯一能推进 seq 的入口；调用方不得自行构造 seq；
 *   2. 同一会话同时只允许一个写入者（S3 用锁文件保证）；
 *   3. `read` 返回的事件必须按 seq 升序，且 seq 连续无空洞；
 *   4. `flush` 返回后，已 append 的事件必须已经落到磁盘（崩溃一致性边界）。
 * @failureModes 实现方在 IO 失败时抛 AgentError("IO_ERROR")；锁冲突抛 SESSION_LOCKED。
 * @concepts docs/concepts/event-sourcing.md
 */

import type { NewSessionEvent, SessionEvent } from "./events";

/**
 * 会话存储。
 *
 * 注意这个接口刻意很小：读取投影、消息组装、压缩都不在这里，
 * 它们消费事件而不是持有状态——这是事件溯源能让"重放 == 实时"的前提。
 */
export interface SessionStore {
  /** 会话 id（`sess_…`）。 */
  readonly id: string;
  /** 下一条事件将获得的 seq；只读暴露便于测试断言连续性。 */
  readonly nextSeq: number;

  /** 追加单条事件，返回分配好信封字段的完整事件。 */
  append(event: NewSessionEvent): Promise<SessionEvent>;
  /** 批量追加：要么整批成功，要么整批失败（避免半批语义）。 */
  appendBatch(events: readonly NewSessionEvent[]): Promise<readonly SessionEvent[]>;
  /** 读取事件；不传 fromSeq 时从头读。 */
  read(fromSeq?: number): Promise<readonly SessionEvent[]>;
  /** 落盘屏障：返回后已写入的事件必须可被恢复。 */
  flush(): Promise<void>;
  /** 关闭写入通道；之后 append 应失败。 */
  close(): Promise<void>;
}
