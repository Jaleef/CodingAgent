# F00 · 框架骨架

## 1. 解决什么问题

在没有任何业务逻辑之前，先让仓库"可编译、可运行、可验证"：

- 目录分层与依赖方向就位，后续每一步只填肉、不改骨架；
- 跨模块契约（消息、工具、事件、provider、配置、权限）冻结，避免边写边改接口；
- 构建链与门禁跑通，后面每一步都有统一的"完成定义"；
- 学习文档体系就位，注释从第一行起就是交付物。

## 2. 涉及哪些概念

- **分层与依赖方向**：`cli/tui → core → shared`，core 不得反向依赖 UI。
- **契约先行**：先定数据形状，再写实现；契约只覆盖"确实被多方使用"的部分。
- **可运行骨架**：空实现也要能被 `--version`、测试、构建完整验证，避免"写到一半才发现跑不起来"。
- **注释即交付物**：文件头五要素 + 导出 JSDoc + 取舍说明，由 `check:docs` 守结构。
- **事件溯源（预告）**：18 类事件在 F0 冻结，S2/S3 才实现 store 与重放。

## 3. 有什么取舍

- **npm 而不是 pnpm**：pnpm 12 的 store 操作锁固定建在 `%LOCALAPPDATA%\pnpm-store-operation-locks`，
  Windows 下通过 Known Folder API 解析，环境变量无法重定向；当前沙箱禁止写该目录，安装必失败。
  npm 的 cache 可以通过 `.npmrc` 放进仓库，所以改用 npm。代价：与 DSH 生态常用的 pnpm 不一致，
  将来若回到不受限环境，需要删 `.npmrc` 与 `node_modules` 后重装。
- **`moduleResolution: Bundler` 而不是 NodeNext**：唯一运行入口是打包产物，源码不被 Node
  直接加载；Bundler 允许无后缀导入，tsx/vitest 零配置。代价：不能 `node src/main.ts`
  直接跑，必须先构建。
- **rolldown 而不是 tsup/esbuild**：esbuild 的 JS API 会启动常驻子进程并通过管道通信，
  本机沙箱禁止"捕获子进程 stdout"的 spawn，tsup 必然失败；rolldown 是进程内 N-API，
  且 Vite/Vitest 已经在用，版本可控。代价：构建配置需要自己维护（`scripts/build.mjs`）。
- **Vitest + 线程池 + 预加载**：Vite 在 Windows 上首次 realpath 会执行 `net use` 探测，
  同样被沙箱拦截；`scripts/sandbox-preload.mjs` 让 Vite 走 EISDIR 回退分支，
  测试固定 `--pool=threads`（不 fork 子进程）。代价：这两处是沙箱兼容层，
  换到不受限环境也应保留（无害，只是少了一点 realpath 优化）。
- **静态 TUI 提前落地**：F0 就引入 Ink/React，而不是等 S15。理由：ESM + JSX + bundle + bin
  是整条链里最容易踩坑的部分，提前验证比事后返工便宜。代价：F0 多了一个会误导的"假界面"
  （已用固定文案明确说明内核未接入）；且 TUI 需要真实终端，自动化验证要等 S15 的
  `ink-testing-library`。
- **契约先冻结、实现留空**：好处是后续步骤不会反复改接口；代价是早期可能过度设计。
  缓解：只冻结跨模块类型，工具的执行细节（超时、渲染）全部留在定义之外。
- **`check:docs` 用启发式而不是 AST**：实现成本低、运行快、零依赖；代价是可能漏判或误判
  （例如文件头恰好贴着第一个 export）。语义质量仍靠 review。

## 4. 怎么验证

```powershell
npm install
npm run typecheck
npm run lint
npm test
npm run check:docs
npm run build
node dist/cli.js --version
node dist/cli.js          # 交互终端中打开 TUI；/exit 或 Ctrl+C 退出
```

预期：

- `typecheck` / `lint` 0 错误；
- `test` 通过 9 个用例（配置 5 个 + 事件 3 个 + TUI 渲染 1 个）；
- `check:docs` 输出通过信息；
- `build` 生成 `dist/main.js`，含 shebang；
- `--version` 输出 `0.1.0`。

覆盖的红线：P1（投影只三字段，已在 `ToolSchema` 类型上体现）、P4（错误码枚举）、
P10（事件 `v: 1` 与配置 schema）、P11（文件头/注释作为交付物）。

## 5. 下一步

S1：配置加载与优先级（用户 → 项目 → env → CLI flag），并补对应单元测试与笔记。
已知限制：F0 的 `--print/--json` 只输出"内核尚未接入"的提示；TUI 的输入会得到固定回复。
