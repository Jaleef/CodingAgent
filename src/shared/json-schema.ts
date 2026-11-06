/**
 * @file JSON Schema 的最小类型别名
 * @responsibility 为"模型可见的工具参数描述"提供一个不依赖第三方库的结构类型，
 *                 让 llm / tools / mcp 三个模块共享同一种 schema 形状。
 * @invariants 它只表达"这是一个 JSON 对象"，不校验内容；真正的生成与校验分别由
 *             S6（zod → JSON Schema 投影）与 S26（MCP schema 校验）负责。
 * @failureModes 纯类型，无运行时失败路径。
 * @concepts docs/concepts/tool-contract.md
 */

/**
 * 一段 JSON Schema。
 *
 * 为什么用 `Record<string, unknown>` 而不是引入 @types/json-schema？
 * - 本项目只把 schema 当作"不透明数据"透传给模型，不需要在类型层穷举关键字；
 * - 少一个依赖，也避免第三方类型与 zod 生成结果之间的版本错配。
 */
export type JsonSchema = Readonly<Record<string, unknown>>;
