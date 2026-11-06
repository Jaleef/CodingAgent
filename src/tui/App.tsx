/**
 * @file TUI 根组件
 * @responsibility 维护 F0 阶段的转录状态、处理斜杠命令、把输入交给（尚未存在的）内核。
 * @invariants
 *   1. /exit 通过 Ink 的 exit() 正常卸载，返回码为 0；
 *   2. 未知命令按普通消息处理，不报错——避免"命令拼错就卡住"；
 *   3. 所有转录条目都有稳定 id，React 列表不会因重排而复用错误节点。
 * @failureModes 无（真正的错误处理在 S12 之后接入）。
 * @concepts docs/concepts/agent-loop.md
 */

import { Box, useApp } from "ink";
import { useState } from "react";

import type { PermissionMode } from "../core/permission/types";
import { newId } from "../shared/ulid";
import { Composer } from "./components/Composer";
import { Header } from "./components/Header";
import { StatusBar } from "./components/StatusBar";
import { Transcript } from "./components/Transcript";
import type { TranscriptEntry } from "./types";

/**
 * App 的输入。
 */
export interface AppProps {
  readonly cwd: string;
  readonly provider: string;
  readonly model: string;
  readonly permission: PermissionMode;
  readonly version: string;
}

/**
 * 欢迎语：让第一次启动的人立刻知道"现在能做什么、不能做什么"。
 */
const WELCOME = [
  "F0 框架已就绪：骨架、契约与构建链可用。",
  "模型与工具尚未接入，输入内容只会得到固定回复。",
  "下一步：按 STEPS.md 从 S1（配置加载）开始逐步实现。",
].join("\n");

/**
 * 帮助文本。
 */
const HELP = [
  "可用命令：",
  "  /help    显示本帮助",
  "  /clear   清空当前转录",
  "  /exit    退出",
].join("\n");

/**
 * 固定回复：明确告诉学习者"这里还没接线"，而不是伪造一个模型回答。
 */
const STUB_REPLY =
  "（F0 骨架）内核尚未接入：S12 会实现 turn/step 循环，S4/S5 接入 LLM，S7 接入工具管线。";

/**
 * 生成一条转录条目。
 *
 * 为什么每次新建 id 而不是用数组下标做 key？
 * 下标 key 在删除/重排时会复用错误的 DOM/节点状态；稳定 id 是列表渲染的底线。
 */
function entry(role: TranscriptEntry["role"], text: string): TranscriptEntry {
  return { id: newId("msg"), role, text };
}

/**
 * 根组件。
 */
export function App({ cwd, provider, model, permission, version }: AppProps) {
  const { exit } = useApp();
  const [entries, setEntries] = useState<readonly TranscriptEntry[]>(() => [
    entry("system", WELCOME),
  ]);

  const append = (next: readonly TranscriptEntry[]): void => {
    setEntries((current) => [...current, ...next]);
  };

  const handleSubmit = (raw: string): void => {
    const text = raw.trim();
    if (text.length === 0) return;

    switch (text) {
      case "/exit":
        exit();
        return;
      case "/help":
        append([entry("system", HELP)]);
        return;
      case "/clear":
        setEntries([entry("system", WELCOME)]);
        return;
      default:
        // 未知命令按普通消息处理，F0 阶段统一回固定文案。
        append([entry("user", text), entry("assistant", STUB_REPLY)]);
    }
  };

  return (
    <Box flexDirection="column">
      <Header cwd={cwd} provider={provider} model={model} permission={permission} version={version} />
      <Transcript entries={entries} />
      <Composer onSubmit={handleSubmit} />
      <StatusBar status="idle" detail="F0 · kernel 未接入" />
    </Box>
  );
}
