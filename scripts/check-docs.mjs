#!/usr/bin/env node
/**
 * @file 学习型注释的自动校验
 * @responsibility 用启发式规则守住"注释是交付物"这条红线：
 *   1. src/**\/*.{ts,tsx} 必须有文件头，且包含 @file / @responsibility /
 *      @invariants / @failureModes / @concepts 五个标签；
 *   2. 文件头里的 @concepts 指向的文档必须真实存在；
 *   3. 每个 export 声明上方必须有 JSDoc；
 *   4. STEPS.md 中勾选的步骤必须有对应的 docs/notes/<ID>-*.md。
 * @invariants 只读，不修改任何文件；规则是启发式的，漏网情况交给 code review。
 * @failureModes 发现违规时打印清单并以退出码 1 结束。
 * @concepts docs/comment-style.md
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = process.cwd();
const problems = [];

/**
 * 递归收集目录下的 .ts/.tsx 文件。
 */
function collectSourceFiles(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(name)) {
      files.push(full);
    }
  }
  return files;
}

/**
 * 读取文件头（允许 shebang 与前置空行）。
 */
function readHeader(lines) {
  let start = 0;
  if (lines[0]?.startsWith("#!")) start = 1;
  while (start < lines.length && lines[start].trim() === "") start += 1;
  if (!lines[start]?.trim().startsWith("/**")) return null;

  let end = start;
  while (end < lines.length && !lines[end].includes("*/")) end += 1;
  return lines.slice(start, Math.min(end + 1, lines.length)).join("\n");
}

const REQUIRED_TAGS = ["@file", "@responsibility", "@invariants", "@failureModes", "@concepts"];
const EXPORT_PATTERN =
  /^\s*export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|interface|type|enum)\b/;

for (const file of collectSourceFiles(join(root, "src"))) {
  const rel = relative(root, file);
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  const header = readHeader(lines);

  if (header === null) {
    problems.push(`${rel}: 缺少文件头 JSDoc`);
  } else {
    for (const tag of REQUIRED_TAGS) {
      if (!header.includes(tag)) problems.push(`${rel}: 文件头缺少 ${tag}`);
    }
    for (const match of header.matchAll(/@concepts\s+(\S+)/g)) {
      const target = resolve(root, match[1]);
      if (!existsSync(target)) {
        problems.push(`${rel}: @concepts 指向不存在的文件 ${match[1]}`);
      }
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (!EXPORT_PATTERN.test(line)) continue;
    if (line.includes("/**")) continue; // 单行 JSDoc
    let j = i - 1;
    while (j >= 0 && (lines[j] ?? "").trim() === "") j -= 1;
    const previous = (lines[j] ?? "").trim();
    if (!previous.endsWith("*/")) {
      problems.push(`${rel}:${i + 1}: export 声明缺少 JSDoc`);
    }
  }
}

// 已勾选步骤必须有学习笔记。
const stepsPath = join(root, "STEPS.md");
if (!existsSync(stepsPath)) {
  problems.push("STEPS.md: 文件不存在");
} else {
  const steps = readFileSync(stepsPath, "utf8");
  const checked = [...steps.matchAll(/^- \[x\]\s+(F0|S\d{2})\b/gm)].map((m) => m[1]);
  const notesDir = join(root, "docs", "notes");
  const notes = existsSync(notesDir) ? readdirSync(notesDir) : [];
  for (const id of checked) {
    if (!notes.some((name) => name.startsWith(`${id}-`))) {
      problems.push(`STEPS.md: 已勾选 ${id} 但缺少 docs/notes/${id}-*.md`);
    }
  }
}

if (problems.length > 0) {
  console.error("check:docs 发现以下问题：");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log("check:docs 通过：文件头、@concepts 链接、导出 JSDoc、步骤笔记均齐全。");
