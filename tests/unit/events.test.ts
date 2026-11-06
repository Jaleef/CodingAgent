/**
 * @file 会话事件契约测试
 * @responsibility 证明事件集合稳定、载荷能被类型收窄、完整事件包含信封字段。
 * @invariants 这些断言是 S2/S3 重放逻辑的前提：形状变了，重放就会静默失真。
 * @failureModes 断言失败即测试失败。
 * @concepts docs/concepts/event-sourcing.md
 */

import { describe, expect, it } from "vitest";

import {
  EVENT_TYPES,
  type NewSessionEvent,
  type SessionEvent,
} from "../../src/core/session/events";
import { isoNow } from "../../src/shared/time";

describe("会话事件契约", () => {
  it("v1 事件类型唯一且数量为 18（证明集合没有意外增减）", () => {
    expect(EVENT_TYPES).toHaveLength(18);
    expect(new Set(EVENT_TYPES).size).toBe(18);
  });

  it("载荷可以按 type 收窄（证明判别联合可用）", () => {
    const event: NewSessionEvent = {
      sessionId: "sess_test",
      type: "tool/result",
      data: {
        callId: "call_1",
        ok: true,
        content: [{ type: "text", text: "done" }],
      },
    };

    if (event.type === "tool/result") {
      expect(event.data.ok).toBe(true);
      expect(event.data.callId).toBe("call_1");
    } else {
      throw new Error("类型收窄失败：tool/result 未被识别");
    }
  });

  it("完整事件必须携带 v/seq/id/ts 信封字段（证明 store 的职责边界）", () => {
    const stored: SessionEvent = {
      v: 1,
      seq: 1,
      id: "evt_test",
      ts: isoNow(new Date("2026-01-01T00:00:00.000Z")),
      sessionId: "sess_test",
      type: "session/disposed",
      data: { reason: "test" },
    };

    expect(stored.v).toBe(1);
    expect(stored.seq).toBe(1);
    expect(stored.ts).toBe("2026-01-01T00:00:00.000Z");
    expect(stored.id).toBe("evt_test");
  });
});
