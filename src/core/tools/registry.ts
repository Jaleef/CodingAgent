/**
 * @file 工具注册表接口
 * @responsibility 维护"当前会话可用的工具集合"，并把它投影成模型可见的 schema 列表。
 * @invariants
 *   1. 名称唯一；后注册者覆盖先注册者（便于测试替换内置工具）；
 *   2. `schemas()` 的排序必须稳定（按名称升序）——顺序变化会破坏 KV cache 前缀；
 *   3. 投影只包含 name/description/input_schema 三个字段（红线的直接落点）。
 * @failureModes 重名注册默认覆盖；如需禁止，由实现方提供 strict 选项（S6 决定）。
 * @concepts docs/concepts/tool-contract.md
 */

import type { ToolSchema } from "../llm/types";
import type { ToolDefinition } from "./definition";

/**
 * 工具注册表。
 */
export interface ToolRegistry {
  /** 注册或替换一个工具。 */
  register(definition: ToolDefinition): void;
  /** 移除工具；不存在时静默返回。 */
  unregister(name: string): void;
  /** 按名称查找；不存在返回 undefined。 */
  get(name: string): ToolDefinition | undefined;
  /** 当前所有工具（顺序稳定）。 */
  list(): readonly ToolDefinition[];
  /** 模型可见的 schema 投影（按名称升序）。 */
  schemas(): readonly ToolSchema[];
}
