/**
 * @file 配置 schema 单元测试
 * @responsibility 证明三条契约：默认值自洽、未知字段被拒绝、越界值给出可定位的错误。
 * @invariants 测试不读写磁盘、不依赖环境变量，可在任意机器重复运行。
 * @failureModes 断言失败即测试失败。
 * @concepts docs/concepts/agent-loop.md
 */

import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG } from "../../src/core/config/defaults";
import { parseConfig } from "../../src/core/config/schema";
import { AgentError } from "../../src/shared/errors";

describe("配置 schema", () => {
  it("空对象得到完整默认配置（证明默认值自洽）", () => {
    const config = parseConfig({});

    expect(config.provider).toBe("deepseek");
    expect(config.permission).toBe("workspace-write");
    expect(config.limits.maxStepsPerTurn).toBe(40);
    expect(config.permissions.autoApproveTools).toEqual(["read", "glob", "grep"]);
    expect(config.compaction.triggerRatio).toBe(0.75);
    expect(config.subagents.maxDepth).toBe(1);
    expect(config.mcp.servers).toEqual({});
    // 默认配置必须与"解析空对象"完全一致，否则两处默认值会漂移。
    expect(DEFAULT_CONFIG).toEqual(config);
  });

  it("未知字段被拒绝（证明拼写错误不会静默生效）", () => {
    expect(() => parseConfig({ unknowKey: true })).toThrow(AgentError);
  });

  it("越界值报错并带字段路径（证明错误可定位）", () => {
    try {
      parseConfig({ compaction: { triggerRatio: 2 } });
      throw new Error("应当抛出 INVALID_CONFIG");
    } catch (error) {
      expect(error).toBeInstanceOf(AgentError);
      const agentError = error as AgentError;
      expect(agentError.code).toBe("INVALID_CONFIG");
      expect(agentError.message).toContain("compaction.triggerRatio");
    }
  });

  it("MCP server 的 command 与 url 必须二选一", () => {
    expect(() => parseConfig({ mcp: { servers: { demo: {} } } })).toThrow(AgentError);
    expect(() =>
      parseConfig({
        mcp: { servers: { demo: { command: "node", url: "https://example.com" } } },
      }),
    ).toThrow(AgentError);

    const config = parseConfig({ mcp: { servers: { demo: { command: "node" } } } });
    expect(config.mcp.servers.demo?.command).toBe("node");
  });

  it("局部覆盖不会丢掉其余默认值（证明合并语义）", () => {
    const config = parseConfig({ model: "custom-model" });
    expect(config.model).toBe("custom-model");
    expect(config.limits.toolTimeoutMs).toBe(120_000);
  });
});
