/**
 * @file 权限与审批的类型契约
 * @responsibility 定义三档权限模式、权限判定结果、审批请求/答复的形状。
 *                 实现（决策矩阵、路径沙箱、命令分类）分别在 S17–S20 落地。
 * @invariants
 *   1. 没有审批通道时，默认答案是 deny（fail-closed）——这是安全红线的类型基础；
 *   2. 审批答复只能表达 allow-once / allow-session / deny 三种意图，不允许"部分允许"；
 *   3. 所有判定最终都要能被记录成 `permission/decision` 事件（S17）。
 * @failureModes 纯类型，无运行时失败路径。
 * @concepts docs/concepts/permission-and-sandbox.md
 */

/**
 * 三档权限模式（与 CLI 的 `--permission` 取值一一对应）。
 *
 * - read-only：只读工具与只读 shell 白名单；
 * - workspace-write：工作区内可写，shell 变更类命令默认询问；
 * - danger-full-access：全盘放行，仅拦截灾难级命令。
 */
export type PermissionMode = "read-only" | "workspace-write" | "danger-full-access";

/**
 * 权限模式常量表，供 zod 枚举与 UI 下拉共同引用，避免两处硬编码。
 */
export const PERMISSION_MODES = [
  "read-only",
  "workspace-write",
  "danger-full-access",
] as const;

/**
 * 一次权限判定的结论。
 *
 * `ask` 不是最终态：它表示"需要人确认"，由审批流程（S20）转成 allow 或 deny。
 */
export type PermissionDecisionKind = "allow" | "deny" | "ask";

/**
 * 权限判定结果。
 */
export interface PermissionDecision {
  readonly kind: PermissionDecisionKind;
  /** 给人看的理由，会写进审计事件，也可能展示在 TUI 上。 */
  readonly reason: string;
}

/**
 * 风险等级，用于审批弹窗的视觉提示与默认答案。
 */
export type RiskLevel = "low" | "medium" | "high";

/**
 * 发起一次审批请求所需的最小信息。
 */
export interface ApprovalRequest {
  /** 关联的工具调用 id；纯文件写操作也可能是独立 id。 */
  readonly id: string;
  /** 工具名或操作名，例如 "shell"、"write"。 */
  readonly toolName: string;
  /** 一句话摘要，展示在标题栏。 */
  readonly summary: string;
  /** 详情（命令全文、diff、路径），由 UI 决定如何渲染。 */
  readonly details?: string;
  readonly risk: RiskLevel;
}

/**
 * 用户对审批请求的答复。
 *
 * 设计成判别联合而不是 boolean：未来要加"编辑后允许"时不必破坏已存事件。
 */
export type ApprovalAnswer =
  | { readonly kind: "allow-once" }
  | { readonly kind: "allow-session" }
  | { readonly kind: "deny"; readonly reason?: string };

/**
 * 工具与循环在运行期访问权限能力的接口。
 *
 * 为什么工具拿到的是"能力接口"而不是整个权限引擎？
 * 工具只应能"请求判定/发起审批"，不应能修改模式或读取审计历史，最小权限原则。
 */
export interface PermissionApi {
  readonly mode: PermissionMode;
  /** 请求人工审批；实现方负责超时与 fail-closed。 */
  ask(request: ApprovalRequest): Promise<ApprovalAnswer>;
}
