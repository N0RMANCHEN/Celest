#!/usr/bin/env node
/**
 * 架构检查脚本
 * 检查分层边界、依赖方向等架构原则
 */

import { readFile, readdir } from "fs/promises";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");
const SRC_DIR = join(PROJECT_ROOT, "src");

// 架构规则
const ARCHITECTURE_RULES = {
  // entities/ 和 core/ 不能导入 React
  noReactInDomain: {
    paths: ["entities", "core"],
    forbidden: ["react", "react-dom"],
    message: "entities/ 和 core/ 不能导入 React",
  },
  // state/ 不能导入 UI 引擎类型
  noUIEngineInState: {
    paths: ["state"],
    forbidden: ["reactflow", "monaco", "@monaco-editor"],
    message: "state/ 不能导入 UI 引擎类型",
  },
  // core/ 不能依赖 features/shell/state
  noUpwardDepsInCore: {
    paths: ["core"],
    forbidden: ["features", "shell", "state"],
    message: "core/ 不能依赖 features/shell/state",
  },
  // entities/ 不能依赖 state/features/shell
  noUpwardDepsInEntities: {
    paths: ["entities"],
    forbidden: ["state", "features", "shell"],
    message: "entities/ 不能依赖 state/features/shell",
  },
};

/**
 * 检查文件是否在指定路径下
 */
function isInPath(filePath, paths) {
  return paths.some((path) => filePath.includes(`/${path}/`));
}

/**
 * 检查导入语句
 */
function checkImports(content, filePath, rule) {
  const issues = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // 检查 import 语句
    for (const forbidden of rule.forbidden) {
      const importRegex = new RegExp(
        `import.*from.*['"]${forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
      );
      if (importRegex.test(line)) {
        issues.push({
          file: filePath,
          line: lineNum,
          rule: rule.message,
          violation: `导入了禁止的依赖: ${forbidden}`,
        });
      }
    }

    // 检查相对路径导入（向上依赖）
    if (rule.forbidden.includes("features") || rule.forbidden.includes("shell") || rule.forbidden.includes("state")) {
      const relativeImportRegex = /import.*from.*['"]\.\.\/\.\.\/(features|shell|state)/;
      const match = line.match(relativeImportRegex);
      if (match) {
        const importedModule = match[1];
        if (rule.forbidden.includes(importedModule)) {
          issues.push({
            file: filePath,
            line: lineNum,
            rule: rule.message,
            violation: `向上依赖: ${importedModule}`,
          });
        }
      }
    }
  }

  return issues;
}

/**
 * 递归扫描目录
 */
async function scanDirectory(dir, results = []) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        await scanDirectory(fullPath, results);
      } else if (entry.isFile()) {
        const ext = extname(entry.name);
        if ([".ts", ".tsx"].includes(ext)) {
          const relativePath = fullPath.replace(PROJECT_ROOT, "");
          results.push(relativePath);
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error.message);
  }

  return results;
}

/**
 * 主函数
 */
async function main() {
  console.log("🏗️  架构检查...\n");

  const files = await scanDirectory(SRC_DIR);
  const allIssues = [];

  // 检查每个规则
  for (const [ruleName, rule] of Object.entries(ARCHITECTURE_RULES)) {
    const relevantFiles = files.filter((f) => isInPath(f, rule.paths));

    for (const filePath of relevantFiles) {
      try {
        const fullPath = join(PROJECT_ROOT, filePath);
        const content = await readFile(fullPath, "utf-8");
        const issues = checkImports(content, filePath, rule);
        allIssues.push(...issues);
      } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
      }
    }
  }

  // 报告结果
  if (allIssues.length === 0) {
    console.log("✅ 架构检查通过，未发现违规");
    process.exit(0);
  } else {
    console.log(`❌ 发现 ${allIssues.length} 个架构违规:\n`);

    // 按文件分组
    const issuesByFile = {};
    for (const issue of allIssues) {
      if (!issuesByFile[issue.file]) {
        issuesByFile[issue.file] = [];
      }
      issuesByFile[issue.file].push(issue);
    }

    // 输出报告
    for (const [file, issues] of Object.entries(issuesByFile)) {
      console.log(`📄 ${file}:`);
      for (const issue of issues) {
        console.log(`   行 ${issue.line}: ${issue.rule}`);
        console.log(`   ${issue.violation}`);
      }
      console.log();
    }

    console.log(`❌ 请修复上述 ${allIssues.length} 个架构违规后再提交`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ 检查失败:", error);
  process.exit(1);
});



