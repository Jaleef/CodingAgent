/**
 * @file 默认配置
 * @responsibility 提供一份"零输入即可运行"的冻结默认配置，供 CLI 启动与测试复用。
 * @invariants 内容完全由 configSchema 生成，不手工拼写，避免与 schema 漂移。
 * @failureModes 无（schema 自身的默认值保证解析成功）。
 * @concepts docs/concepts/agent-loop.md
 */

import { type Config, parseConfig } from "./schema";

/**
 * 默认配置。
 *
 * 只做浅冻结：嵌套对象仍可被误改。之所以不深冻结，是因为后续步骤需要
 * 在"默认值基础上"做局部覆盖（S1 的加载合并），浅冻结已能防止整对象被替换。
 */
export const DEFAULT_CONFIG: Readonly<Config> = Object.freeze(parseConfig({}));
