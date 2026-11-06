/**
 * @file provider 注册表接口
 * @responsibility 定义"按 id 解析 provider"的契约，供 CLI 选择、子代理覆盖模型时使用。
 * @invariants 注册是幂等的：同 id 后注册者覆盖先注册者（便于测试注入 FakeProvider）；
 *             查询未知 id 返回 undefined，而不是抛错（由调用方决定如何报错）。
 * @failureModes 无运行时失败路径；实现见 S4/S5。
 * @concepts docs/concepts/agent-loop.md
 */

import type { LlmProvider } from "./types";

/**
 * provider 注册表。
 */
export interface LlmRegistry {
  /** 注册（或替换）一个 provider。 */
  register(provider: LlmProvider): void;
  /** 按 id 查找；不存在返回 undefined。 */
  get(id: string): LlmProvider | undefined;
  /** 已注册的 provider id 列表（顺序稳定，便于展示）。 */
  list(): readonly string[];
}
