/**
 * @file TUI 配色
 * @responsibility 集中管理终端颜色，避免各组件散落硬编码色值。
 * @invariants 只使用 ANSI 基础色名，保证在不支持真彩色的终端里也可读。
 * @failureModes 无。
 * @concepts docs/concepts/agent-loop.md
 */

/**
 * 主题色板。
 *
 * 语义化命名（user/assistant/system/accent/danger）而不是 red/green，
 * 这样将来换主题只需要改这一处。
 */
export const theme = {
  user: "cyan",
  assistant: "white",
  system: "gray",
  accent: "green",
  danger: "red",
  warning: "yellow",
  muted: "gray",
} as const;
