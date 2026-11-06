/**
 * @file LLM 层的共享类型
 * @responsibility 定义"provider 无关"的消息模型、请求/流式增量、用量与 provider 接口。
 *                 这是整个 harness 与具体模型厂商之间的边界。
 * @invariants
 *   1. assistant 消息带 toolCalls 时，历史里必须为每个 callId 提供一条 tool 消息
 *      （API 合法性是硬不变量，由 S2/S27 的 replay/repair 保证）；
 *   2. ContentBlock 是模型输入输出的唯一载体，新增模态要在这里扩展；
 *   3. provider 适配器只能"翻译"，不能改变消息语义。
 * @failureModes ProviderError 携带稳定 code；网络/限流/上下文溢出必须可区分。
 * @concepts docs/concepts/context-and-kv-cache.md
 */

import type { JsonSchema } from "../../shared/json-schema";

/**
 * 一条消息内容块。
 *
 * 目前只有文本与图片；后续要加资源引用、音频等，应扩展这里而不是另开通道。
 */
export type ContentBlock =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "image"; readonly mediaType: string; readonly data: string };

/**
 * 模型发起的一次工具调用。
 *
 * `input` 是未校验的原始 JSON（模型可能给出任何东西），
 * 校验发生在工具管线（S7）里，而不是在解析流的时候。
 */
export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly input: unknown;
}

/**
 * 下发给模型的工具描述。
 *
 * 只有三个字段：执行函数、超时、渲染回调都属于内部实现，绝不能出现在这里
 * （红线：模型面只是投影）。
 */
export interface ToolSchema {
  readonly name: string;
  readonly description: string;
  readonly input_schema: JsonSchema;
}

/**
 * provider 无关的消息模型。
 *
 * 与 OpenAI / Anthropic 的差异由适配器吸收；内核只认这一种形状。
 */
export type Message =
  | { readonly role: "system"; readonly content: string }
  | { readonly role: "user"; readonly content: readonly ContentBlock[] }
  | {
      readonly role: "assistant";
      readonly content: readonly ContentBlock[];
      readonly toolCalls?: readonly ToolCall[];
      /** 流式传输中途失败时为 true：消息不完整，但保留下来以便恢复/展示。 */
      readonly incomplete?: boolean;
    }
  | {
      readonly role: "tool";
      readonly toolCallId: string;
      readonly content: readonly ContentBlock[];
      readonly isError?: boolean;
    };

/**
 * provider 返回的 token 用量。
 *
 * cachedInputTokens 用于观察 KV cache 命中情况——这是评估"前缀是否稳定"的
 * 唯一客观指标（S21 会用它校准估算）。
 */
export interface Usage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cachedInputTokens?: number;
}

/**
 * 一次模型请求。
 *
 * 注意：这里没有 `signal`，取消信号由 `stream(req, signal)` 单独传递，
 * 避免把"可复用的请求描述"和"一次性的取消控制"混在同一个对象里。
 */
export interface LlmRequest {
  readonly model: string;
  readonly messages: readonly Message[];
  readonly tools: readonly ToolSchema[];
  readonly maxOutputTokens?: number;
  readonly temperature?: number;
}

/**
 * 流式增量。
 *
 * 工具调用按 index 分片下发（先 start，再多个 delta 拼 JSON，最后 end），
 * 这套形状刻意贴近 OpenAI 的流式协议，便于适配器实现。
 */
export type LlmDelta =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "tool_start"; readonly index: number; readonly id: string; readonly name: string }
  | { readonly type: "tool_delta"; readonly index: number; readonly json: string }
  | { readonly type: "tool_end"; readonly index: number }
  | { readonly type: "usage"; readonly usage: Usage }
  | { readonly type: "stop"; readonly reason: "end" | "tool_use" | "length" }
  | { readonly type: "error"; readonly error: ProviderError };

/**
 * provider 错误的稳定分类。
 */
export type ProviderErrorCode =
  | "AUTH"
  | "RATE_LIMIT"
  | "OVERLOADED"
  | "CONTEXT_OVERFLOW"
  | "NETWORK"
  | "BAD_RESPONSE"
  | "ABORTED";

/**
 * provider 层错误。
 *
 * 与 AgentError 分开的原因：重试/压缩策略只关心 provider 语义，
 * 不应该被上层的工具错误码污染；适配器负责把 HTTP/SSE 异常映射到这里。
 */
export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(
    code: ProviderErrorCode,
    message: string,
    options: { readonly retryable?: boolean; readonly status?: number; readonly cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "ProviderError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.status = options.status;
  }
}

/**
 * 模型提供方接口。
 *
 * `contextWindow` 用于压缩阈值计算（S21）；不同模型差异很大，必须由适配器回答。
 */
export interface LlmProvider {
  readonly id: string;
  contextWindow(model: string): number;
  stream(request: LlmRequest, signal: AbortSignal): AsyncIterable<LlmDelta>;
}
