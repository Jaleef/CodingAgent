/**
 * @file 会话事件（v1）
 * @responsibility 定义 append-only 事件日志里"每一种事实"的形状。
 *                 这是整个 harness 的事实来源：消息历史、TUI 转录、token 统计
 *                 都从这些事件投影出来，而不是各自维护状态。
 * @invariants
 *   1. 事件一旦写入就不可修改；纠正靠追加新事件，而不是改旧行；
 *   2. `seq` 由 store 单调分配（S2/S3），同一会话内严格递增；
 *   3. `v` 是格式版本；新增事件类型是兼容变更，修改已有 data 形状是破坏变更；
 *   4. 事件里不允许出现 API key、完整环境变量等秘密（红线：脱敏）。
 * @failureModes 未知类型在重放时应被忽略（前向兼容），由 S2 的 replay 负责。
 * @concepts docs/concepts/event-sourcing.md
 */

import type { ContentBlock, ToolCall, Usage } from "../llm/types";
import type { PermissionMode } from "../permission/types";

/**
 * 所有事件共有的信封字段。
 *
 * `turn` / `step` 是可选的定位信息：会话级事件（created、disposed）没有它们，
 * 而 turn 内的事件带上之后，TUI 与重放都能按轮次分组。
 */
export interface SessionEventBase {
  readonly v: 1;
  readonly seq: number;
  readonly id: string;
  readonly ts: string;
  readonly sessionId: string;
  readonly turn?: number;
  readonly step?: number;
}

/**
 * v1 的全部事件载荷（判别联合）。
 *
 * 阅读顺序建议：created → turn/started → step/started → request/header
 * → message/assistant → tool/call → tool/result → turn/ended → disposed。
 */
export type SessionEventPayload =
  /** 会话诞生：记录工作目录、模型与初始权限模式。 */
  | {
      readonly type: "session/created";
      readonly data: {
        readonly cwd: string;
        readonly provider: string;
        readonly model: string;
        readonly permission: PermissionMode;
      };
    }
  /** 会话级设置变化（换模型、切权限模式）。 */
  | {
      readonly type: "session/updated";
      readonly data: {
        readonly model?: string | null;
        readonly permission?: PermissionMode;
        readonly reason: string;
      };
    }
  /** 系统提示全文（仅在哈希变化时写一次，避免每条请求都重复存）。 */
  | { readonly type: "prompt/snapshot"; readonly data: { readonly hash: string; readonly text: string } }
  /** 用户发起一轮。 */
  | { readonly type: "turn/started"; readonly data: { readonly input: string } }
  /** 一轮中的一步开始（一步 ≈ 一次模型请求 + 其后的工具执行）。 */
  | { readonly type: "step/started"; readonly data: { readonly requestId: string } }
  /**
   * 请求头：复现一次请求所需的路由信息。
   *
   * 刻意不存 prompt 正文（由 prompt/snapshot 承担）与消息数组（由消息事件承担），
   * 否则日志会成倍膨胀。
   */
  | {
      readonly type: "request/header";
      readonly data: {
        readonly requestId: string;
        readonly provider: string;
        readonly model: string;
        readonly toolsHash: string;
        readonly promptHash: string;
        readonly toolNames: readonly string[];
        readonly reasoningEffort?: string | null;
      };
    }
  /** 模型输出（完整一步）。`stopReason` 决定循环下一步是继续调工具还是收尾。 */
  | {
      readonly type: "message/assistant";
      readonly data: {
        readonly text: string;
        readonly toolCalls: readonly ToolCall[];
        readonly stopReason: "end" | "tool_use" | "length" | "error";
        readonly usage?: Usage;
      };
    }
  /** 管线收到的一次工具调用（已校验前的原始输入）。 */
  | {
      readonly type: "tool/call";
      readonly data: { readonly callId: string; readonly name: string; readonly input: unknown };
    }
  /** 工具执行结果（成功或结构化失败）。 */
  | {
      readonly type: "tool/result";
      readonly data: {
        readonly callId: string;
        readonly ok: boolean;
        readonly content: readonly ContentBlock[];
        readonly errorCode?: string;
        readonly spillPath?: string;
        readonly durationMs?: number;
      };
    }
  /** 审批/判定结论，审计用。 */
  | {
      readonly type: "permission/decision";
      readonly data: {
        readonly callId?: string;
        readonly toolName: string;
        readonly decision: "allow" | "deny" | "ask";
        readonly mode: PermissionMode;
        readonly reason?: string;
      };
    }
  /** 压缩开始（可用于崩溃后识别"压缩未提交"）。 */
  | {
      readonly type: "compaction/started";
      readonly data: {
        readonly reason: "threshold" | "overflow" | "manual";
        readonly tokensBefore: number;
      };
    }
  /** 压缩提交：投影用一条摘要替换 [fromSeq, toSeq] 区间。 */
  | {
      readonly type: "compaction/committed";
      readonly data: {
        readonly fromSeq: number;
        readonly toSeq: number;
        readonly summary: string;
        readonly tokensBefore: number;
        readonly tokensAfter: number;
        readonly model: string;
      };
    }
  /** 子代理诞生（父会话记录可追溯链接）。 */
  | {
      readonly type: "child/spawned";
      readonly data: {
        readonly childSessionId: string;
        readonly description: string;
        readonly prompt: string;
      };
    }
  /** 子代理结束（成功/失败/取消/超时），供成本核算与 UI 展示。 */
  | {
      readonly type: "child/settled";
      readonly data: {
        readonly childSessionId: string;
        readonly status: "completed" | "failed" | "cancelled" | "timeout";
        readonly usage?: Usage;
      };
    }
  /** MCP server 连接成功。 */
  | {
      readonly type: "mcp/connected";
      readonly data: { readonly server: string; readonly toolCount: number };
    }
  /** MCP server 出错（可能自动重连）。 */
  | {
      readonly type: "mcp/server_error";
      readonly data: { readonly server: string; readonly message: string; readonly willRetry: boolean };
    }
  /** 一轮结束。`reason` 是排障时最该先看的一个字段。 */
  | {
      readonly type: "turn/ended";
      readonly data: {
        readonly reason: "completed" | "aborted" | "error" | "max_steps" | "timeout" | "interrupted";
        readonly usage?: Usage;
      };
    }
  /** 会话销毁。 */
  | { readonly type: "session/disposed"; readonly data: { readonly reason: string } };

/**
 * 落盘后的完整事件 = 信封 + 载荷。
 *
 * 用交叉类型而不是"信封字段摊平进每个分支"，是为了让 store 的 seq/id/ts
 * 分配逻辑只写一次（见 S2）。
 */
export type SessionEvent = SessionEventBase & SessionEventPayload;

/**
 * 分发给 store 之前的事件：缺少 v/seq/id/ts 四个由 store 分配的字段。
 *
 * 之所以让调用方构造 NewSessionEvent 而不是完整事件，是为了从类型上禁止
 * "自己指定 seq"——seq 只能由唯一的写入者分配，否则日志会出现空洞或重号。
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/**
 * 待写入事件。
 */
export type NewSessionEvent = DistributiveOmit<SessionEvent, "v" | "seq" | "id" | "ts">;

/**
 * v1 事件类型清单（顺序仅用于展示，不代表写入顺序）。
 *
 * 运行时用它做合法性校验；测试用它断言"事件集合没有意外增减"。
 */
export const EVENT_TYPES = [
  "session/created",
  "session/updated",
  "prompt/snapshot",
  "turn/started",
  "step/started",
  "request/header",
  "message/assistant",
  "tool/call",
  "tool/result",
  "permission/decision",
  "compaction/started",
  "compaction/committed",
  "child/spawned",
  "child/settled",
  "mcp/connected",
  "mcp/server_error",
  "turn/ended",
  "session/disposed",
] as const satisfies readonly SessionEvent["type"][];

/**
 * 事件类型联合（从清单推导，避免两处维护）。
 */
export type SessionEventType = (typeof EVENT_TYPES)[number];

/**
 * 类型守卫：判断一个字符串是否是已知事件类型。
 *
 * 用于读取日志时跳过未来版本新增的类型（前向兼容）。
 */
export function isSessionEventType(value: string): value is SessionEventType {
  return (EVENT_TYPES as readonly string[]).includes(value);
}

/**
 * 穷尽性检查：在 switch 的 default 分支调用它。
 *
 * 当联合类型新增成员而某处 switch 未覆盖时，这里会变成类型错误，
 * 从而在编译期而不是运行时发现"忘了处理新事件"。
 */
export function assertNever(value: never): never {
  throw new Error(`未处理的分支：${String(value)}`);
}
