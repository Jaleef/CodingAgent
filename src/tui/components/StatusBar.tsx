/**
 * @file 状态栏
 * @responsibility 展示内核当前状态与 token/成本等运行指标。
 * @invariants 纯展示；F0 阶段只显示固定状态，S12/S21 接入真实数据。
 * @failureModes 无。
 * @concepts docs/concepts/agent-loop.md
 */

import { Box, Text } from "ink";

import { theme } from "../theme";

/**
 * StatusBar 的输入。
 */
export interface StatusBarProps {
  /** 当前状态文本（idle / thinking / tool / waiting-approval）。 */
  readonly status: string;
  /** 右侧附加信息，例如 token 统计。 */
  readonly detail?: string;
}

/**
 * 底部状态栏。
 */
export function StatusBar({ status, detail }: StatusBarProps) {
  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Text color={theme.muted}>状态：{status}</Text>
      {detail === undefined ? null : <Text color={theme.muted}>{detail}</Text>}
    </Box>
  );
}
