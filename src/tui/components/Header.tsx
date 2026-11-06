/**
 * @file 顶部状态头
 * @responsibility 展示"我在哪、用什么模型、什么权限、什么版本"这四件最容易被忽略
 *                 又最容易导致误操作的事。
 * @invariants 纯展示组件：不读取全局状态、不发请求。
 * @failureModes 无。
 * @concepts docs/concepts/permission-and-sandbox.md
 */

import { Box, Text } from "ink";

import type { PermissionMode } from "../../core/permission/types";
import { theme } from "../theme";

/**
 * Header 的输入。
 */
export interface HeaderProps {
  readonly cwd: string;
  readonly provider: string;
  readonly model: string;
  readonly permission: PermissionMode;
  readonly version: string;
}

/**
 * 顶部信息栏。
 *
 * 权限模式单独着色：danger-full-access 必须是"看见就会紧张"的颜色，
 * 这是 UI 层面的安全提示（真正的拦截在 S17–S19）。
 */
export function Header({ cwd, provider, model, permission, version }: HeaderProps) {
  return (
    <Box borderStyle="round" borderColor={theme.muted} paddingX={1} flexDirection="column">
      <Box justifyContent="space-between">
        <Text bold color={theme.accent}>
          ca
        </Text>
        <Text color={theme.muted}>v{version} · F0</Text>
      </Box>
      <Text>
        <Text color={theme.muted}>cwd </Text>
        {cwd}
      </Text>
      <Text>
        <Text color={theme.muted}>model </Text>
        {provider}/{model}
        <Text color={theme.muted}>  permission </Text>
        <Text color={permissionColor(permission)}>{permission}</Text>
      </Text>
    </Box>
  );
}

/**
 * 权限模式 → 颜色。
 *
 * 放在这里而不是 theme.ts，是因为它只服务这一个组件；
 * 若第二个组件也需要，再提取到 theme。
 */
function permissionColor(permission: PermissionMode): string {
  switch (permission) {
    case "read-only":
      return theme.muted;
    case "workspace-write":
      return theme.accent;
    case "danger-full-access":
      return theme.danger;
  }
}
