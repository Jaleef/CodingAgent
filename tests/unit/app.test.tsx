/**
 * @file TUI 静态壳渲染测试
 * @responsibility 证明 F0 的 Ink 组件能在无终端环境下渲染出关键信息，
 *                 为 S15 的流式转录测试提前铺好基础设施。
 * @invariants 测试不依赖真实 TTY；通过 ink-testing-library 提供的假 stdin/stdout 渲染。
 * @failureModes 渲染抛错或关键文本缺失即失败。
 * @concepts docs/concepts/agent-loop.md
 */

import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";

import { App } from "../../src/tui/App";

describe("TUI 静态壳", () => {
  it("渲染欢迎语、模型与权限模式（证明界面可独立渲染）", () => {
    const { lastFrame, unmount } = render(
      <App
        cwd={"C:\\work\\demo"}
        provider="deepseek"
        model="deepseek-chat"
        permission="workspace-write"
        version="0.1.0"
      />,
    );

    const frame = lastFrame() ?? "";

    expect(frame).toContain("F0 框架已就绪");
    expect(frame).toContain("deepseek-chat");
    expect(frame).toContain("workspace-write");
    expect(frame).toContain("v0.1.0");

    unmount();
  });
});
