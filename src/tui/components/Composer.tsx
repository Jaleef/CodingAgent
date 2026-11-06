/**
 * @file 输入框
 * @responsibility 捕获键盘输入、维护当前行文本、在 Enter 时把整行交给上层。
 * @invariants
 *   1. 组件只负责"编辑一行文本 + 提交"，不解析命令语义（/exit 等由 App 处理）；
 *   2. 按下 Ctrl/Alt 组合键时不插入字符，避免把控制序列写进输入；
 *   3. 提交后立即清空，避免重复发送。
 * @failureModes 无（Ink 的 useInput 只在 TTY 下可用；调用方保证只在 TTY 渲染 TUI）。
 * @concepts docs/concepts/agent-loop.md
 */

import { Box, Text, useInput } from "ink";
import { useState } from "react";

import { theme } from "../theme";

/**
 * Composer 的输入。
 */
export interface ComposerProps {
  /** 为 true 时忽略键盘（例如审批弹窗打开时）。 */
  readonly disabled?: boolean;
  /** 提交一整行文本；空行也会传上来，由上层决定忽略。 */
  onSubmit(text: string): void;
}

/**
 * 单行输入框。
 *
 * 这里刻意不引入第三方输入组件：手写一遍 useInput 的按键处理，
 * 是理解"终端 TUI 如何与内核并发运行"的最好方式（见 S15）。
 */
export function Composer({ disabled = false, onSubmit }: ComposerProps) {
  const [value, setValue] = useState("");

  useInput((input, key) => {
    if (disabled) return;

    if (key.return) {
      const text = value;
      setValue("");
      onSubmit(text);
      return;
    }

    if (key.backspace || key.delete) {
      // 用 [...value] 而不是 slice(0, -1)：按字符而不是 UTF-16 码元回退，
      // 避免中文/emoji 被截断成半个字符。
      setValue((current) => [...current].slice(0, -1).join(""));
      return;
    }

    if (key.escape) {
      setValue("");
      return;
    }

    if (key.ctrl && input === "u") {
      setValue("");
      return;
    }

    // 其他 Ctrl/Alt 组合（Ctrl+C、方向键等）交给 Ink/终端处理，不写入文本。
    if (key.ctrl || key.meta) return;

    // 粘贴可能一次给出多个字符，直接追加。
    setValue((current) => current + input);
  });

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={theme.accent}>{"> "}</Text>
        <Text>{value}</Text>
        <Text color={theme.muted}>▌</Text>
      </Box>
      <Text color={theme.muted}>Enter 发送 · /help 帮助 · /exit 或 Ctrl+C 退出</Text>
    </Box>
  );
}
