/**
 * @file 配置 schema
 * @responsibility 用 zod 定义"配置对象的唯一真源"：默认值、取值范围、未知字段拒绝，
 *                 并提供 `parseConfig` 把任意输入变成强类型 Config。
 * @invariants
 *   1. schema 一旦解析成功，Config 的所有字段都有值（默认值在 schema 内声明）；
 *   2. 未知字段一律拒绝（.strict()）——拼错 `trigerRatio` 不应被静默忽略；
 *   3. 密钥永远不进入配置对象，只能来自环境变量（见 S1）。
 * @failureModes 输入非法时抛 AgentError("INVALID_CONFIG")，消息里带字段路径。
 * @concepts docs/concepts/agent-loop.md
 */

import { z } from "zod";

import { AgentError } from "../../shared/errors";
import { PERMISSION_MODES } from "../permission/types";

/**
 * 允许 section 缺省时按空对象处理。
 *
 * 为什么不直接用 `.default({})`？
 * 嵌套对象的所有子字段都有默认值，但 zod 的输出类型里这些字段是"必有"的，
 * 直接 default 一个 `{}` 会在类型层报缺字段。这里用 preprocess 先把 undefined
 * 归一成空对象，再交给对象 schema 应用子字段默认值——语义清楚且与 zod 版本无关。
 */
function section<S extends z.ZodTypeAny>(schema: S): S {
  return z.preprocess((value) => (value === undefined ? {} : value), schema) as unknown as S;
}

/**
 * 单个 MCP server 的配置。
 *
 * 二选一：stdio 用 command/args，HTTP 用 url/headers；
 * 两者同时出现或同时缺失都会被 refine 拒绝。
 */
export const mcpServerSchema = z
  .object({
    /** stdio 传输：可执行命令（例如 npx、node）。 */
    command: z.string().min(1).optional(),
    args: z.array(z.string()).default([]),
    env: z.record(z.string(), z.string()).default({}),
    /** stdio 传输的工作目录。 */
    cwd: z.string().min(1).optional(),
    /** HTTP/SSE 传输：server 地址。 */
    url: z.string().url().optional(),
    headers: z.record(z.string(), z.string()).default({}),
    /** 信任该 server：其非只读工具也不再逐次审批（谨慎使用）。 */
    trust: z.boolean().default(false),
    /** 单次连接/请求超时。 */
    timeoutMs: z.number().int().positive().default(10_000),
  })
  .strict()
  .refine(
    (server) => (server.command === undefined) !== (server.url === undefined),
    { message: "MCP server 必须且只能配置 command（stdio）或 url（HTTP）之一" },
  );

/**
 * 单步/单轮/单工具的预算上限。
 *
 * 这些不是"性能调优"，而是 harness 的安全边界：没有上限的 agent 会在一个坏掉的
 * 工具循环里烧光 token（红线：一切有界）。
 */
const limitsSchema = z
  .object({
    maxStepsPerTurn: z.number().int().positive().max(200).default(40),
    turnTimeoutMs: z.number().int().positive().default(15 * 60_000),
    toolTimeoutMs: z.number().int().positive().default(2 * 60_000),
    maxToolOutputBytes: z.number().int().positive().default(32 * 1024),
    maxConcurrentTools: z.number().int().positive().max(32).default(8),
  })
  .strict();

/**
 * 权限相关的细粒度放行配置。
 *
 * 注意：这里只做"减少询问"，不能突破 PermissionMode 的硬边界（S17 落地）。
 */
const permissionsSchema = z
  .object({
    autoApproveTools: z.array(z.string()).default(["read", "glob", "grep"]),
    autoApproveShell: z.boolean().default(false),
    allowNetworkCommands: z.boolean().default(false),
  })
  .strict();

/**
 * 上下文压缩（compaction）配置。
 */
const compactionSchema = z
  .object({
    enabled: z.boolean().default(true),
    /** 估算 token 达到 contextWindow × triggerRatio 时触发压缩。 */
    triggerRatio: z.number().gt(0).max(1).default(0.75),
    /** 压缩时保留最近多少轮原文。 */
    keepRecentTurns: z.number().int().min(1).default(3),
    /** 摘要模型；null 表示复用主模型。 */
    summarizerModel: z.string().nullable().default(null),
  })
  .strict();

/**
 * 子代理配置。
 */
const subagentsSchema = z
  .object({
    enabled: z.boolean().default(true),
    maxConcurrent: z.number().int().min(1).max(16).default(3),
    /** v1 只允许一层：子代理不能再派生子代理。 */
    maxDepth: z.literal(1).default(1),
    timeoutMs: z.number().int().positive().default(10 * 60_000),
    model: z.string().nullable().default(null),
  })
  .strict();

/**
 * 完整配置 schema。
 *
 * 文件形态示例见 .cagent/config.example.json；加载优先级（用户 → 项目 → env → CLI）
 * 在 S1 实现，本阶段只保证"给定一个对象，能校验并补全默认值"。
 */
export const configSchema = z
  .object({
    provider: z.string().min(1).default("deepseek"),
    model: z.string().min(1).default("deepseek-chat"),
    permission: z.enum(PERMISSION_MODES).default("workspace-write"),
    limits: section(limitsSchema),
    permissions: section(permissionsSchema),
    compaction: section(compactionSchema),
    subagents: section(subagentsSchema),
    mcp: section(
      z
        .object({
          servers: z.record(z.string(), mcpServerSchema).default({}),
        })
        .strict(),
    ),
    debug: z.boolean().default(false),
  })
  .strict();

/**
 * 解析后的强类型配置（所有字段必有值）。
 */
export type Config = z.infer<typeof configSchema>;

/**
 * 解析函数的"可接受输入"类型：允许省略任何有默认值的字段。
 */
export type ConfigInput = z.input<typeof configSchema>;

/**
 * 由 MCP server 配置推导出的类型，供 mcp 模块复用，避免重复定义。
 */
export type McpServerConfig = z.infer<typeof mcpServerSchema>;

/**
 * 校验并补全配置。
 *
 * 为什么把 zod 的 issue 重新拼成字符串？
 * 学习者需要看到"哪个字段错了"；同时 details 里保留原始 issue 供程序化消费。
 */
export function parseConfig(input: unknown): Config {
  const result = configSchema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "<root>";
      return `${path}: ${issue.message}`;
    });
    throw new AgentError("INVALID_CONFIG", `配置无效 —— ${issues.join("; ")}`, {
      details: { issues: result.error.issues },
    });
  }
  return result.data;
}
