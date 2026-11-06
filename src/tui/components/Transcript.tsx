/**
 * @file 转录区
 * @responsibility 渲染对话条目（用户输入、助手回复、系统提示）。
 * @invariants
 *   1. append-only：条目一旦渲染就不再修改（流式文本在 App 层合并成条目）；
 *   2. 不负责滚动与键盘事件，键盘交互集中在 Composer；
 *   3. 未知 role 不应出现（联合类型保证），因此不需要兜底分支。
 * @failureModes 无。
 * @concepts docs/concepts/agent-loop.md
 */

import { Box, Text } from "ink";

import { theme } from "../theme";
import type { TranscriptEntry } from "../types";

/**
 * Transcript 的输入。
 */
export interface TranscriptProps {
  readonly entries: readonly TranscriptEntry[];
}

/**
 * 对话转录列表。
 */
export function Transcript({ entries }: TranscriptProps) {
  return (
    <Box flexDirection="column" paddingX={1} marginY={1}>
      {entries.map((entry) => (
        <Box key={entry.id} marginBottom={1}>
          <Text color={prefixColor(entry)}>{prefixOf(entry)} </Text>
          <Text color={roleColor(entry)}>{entry.text}</Text>
        </Box>
      ))}
    </Box>
  );
}

/**
 * 条目前缀符号：用 ASCII，避免某些 Windows 终端字体缺字。
 */
function prefixOf(entry: TranscriptEntry): string {
  switch (entry.role) {
    case "user":
      return ">";
    case "assistant":
      return "*";
    case "system":
      return "·";
  }
}

/**
 * 前缀颜色。
 */
function prefixColor(entry: TranscriptEntry): string {
  switch (entry.role) {
    case "user":
      return theme.user;
    case "assistant":
      return theme.accent;
    case "system":
      return theme.system;
  }
}

/**
 * 正文颜色：系统提示更淡，避免喧宾夺主。
 */
function roleColor(entry: TranscriptEntry): string {
  switch (entry.role) {
    case "user":
      return theme.user;
    case "assistant":
      return theme.assistant;
    case "system":
      return theme.system;
  }
}
