/**
 * @file TUI 内部共享类型
 * @responsibility 定义转录条目的形状，供 App 与 Transcript 组件共用。
 * @invariants 条目是"已定稿"的文本块：流式增量在 App 内合并后才变成条目，
 *             这样 Transcript 可以做成纯展示组件（append-only，不重排）。
 * @failureModes 无。
 * @concepts docs/concepts/agent-loop.md
 */

/**
 * 条目来源，决定颜色与前缀符号。
 */
export type TranscriptRole = "user" | "assistant" | "system";

/**
 * 一条转录内容。
 */
export interface TranscriptEntry {
  readonly id: string;
  readonly role: TranscriptRole;
  readonly text: string;
}
