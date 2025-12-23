#!/usr/bin/env node
/**
 * 代码质量检查脚本
 * 检查文件大小、圈复杂度等指标
 */

import { readdir, readFile, stat } from "fs/promises";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");
const SRC_DIR = join(PROJECT_ROOT, "src");

// 配置
const MAX_FILE_LINES = 500;
const WARN_FILE_LINES = 300;
const MAX_COMPLEXITY = 15; // 圈复杂度阈值

// 支持的源代码文件扩展名
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

// 排除的目录和文件
const EXCLUDE_PATTERNS = [
  "node_modules",
  "dist",
  ".git",
  "_legacy",
  "*.test.ts",
  "*.test.tsx",
  "*.spec.ts",
  "*.spec.tsx",
];

/**
 * 检查文件是否应该被排除
 */
function shouldExclude(filePath) {
  const relativePath = filePath.replace(SRC_DIR, "");
  return EXCLUDE_PATTERNS.some((pattern) => {
    if (pattern.includes("*")) {
      const regex = new RegExp(pattern.replace("*", ".*"));
      return regex.test(relativePath);
    }
    return relativePath.includes(pattern);
  });
}

/**
 * 计算文件行数
 */
async function countLines(filePath) {
  try {
    const content = await readFile(filePath, "utf-8");
    return content.split("\n").length;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return 0;
  }
}

/**
 * 简单的圈复杂度估算（基于控制流关键字）
 */
function estimateComplexity(content) {
  const complexityKeywords = [
    { pattern: /\bif\b/g, name: "if" },
    { pattern: /\belse\b/g, name: "else" },
    { pattern: /\bfor\b/g, name: "for" },
    { pattern: /\bwhile\b/g, name: "while" },
    { pattern: /\bswitch\b/g, name: "switch" },
    { pattern: /\bcase\b/g, name: "case" },
    { pattern: /\bcatch\b/g, name: "catch" },
    { pattern: /&&/g, name: "&&" },
    { pattern: /\|\|/g, name: "||" },
    { pattern: /\?/g, name: "?" },
    { pattern: /\?\?/g, name: "??" },
  ];

  let complexity = 1; // 基础复杂度

  for (const { pattern } of complexityKeywords) {
    const matches = content.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }

  return complexity;
}

/**
 * 递归扫描目录
 */
async function scanDirectory(dir, results = []) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (shouldExclude(fullPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        await scanDirectory(fullPath, results);
      } else if (entry.isFile()) {
        const ext = extname(entry.name);
        if (SOURCE_EXTENSIONS.includes(ext)) {
          const lines = await countLines(fullPath);
          const content = await readFile(fullPath, "utf-8");
          const complexity = estimateComplexity(content);
          const relativePath = fullPath.replace(PROJECT_ROOT, "");

          results.push({
            path: relativePath,
            lines,
            complexity,
          });
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
  console.log("🔍 代码质量检查...\n");

  const files = await scanDirectory(SRC_DIR);
  const issues = [];

  // 检查文件大小
  const largeFiles = files.filter((f) => f.lines > MAX_FILE_LINES);
  const warnFiles = files.filter(
    (f) => f.lines > WARN_FILE_LINES && f.lines <= MAX_FILE_LINES
  );

  // 检查圈复杂度
  const complexFiles = files.filter((f) => f.complexity > MAX_COMPLEXITY);

  // 报告结果
  console.log(`📊 统计信息:`);
  console.log(`   总文件数: ${files.length}`);
  console.log(`   总代码行数: ${files.reduce((sum, f) => sum + f.lines, 0)}`);
  console.log(
    `   平均文件大小: ${Math.round(
      files.reduce((sum, f) => sum + f.lines, 0) / files.length
    )} 行`
  );
  console.log(
    `   平均复杂度: ${Math.round(
      files.reduce((sum, f) => sum + f.complexity, 0) / files.length
    )}`
  );
  console.log();

  if (warnFiles.length > 0) {
    console.log(`⚠️  警告：${warnFiles.length} 个文件超过 ${WARN_FILE_LINES} 行（建议拆分）:`);
    warnFiles
      .sort((a, b) => b.lines - a.lines)
      .forEach((f) => {
        console.log(`   ${f.path}: ${f.lines} 行`);
      });
    console.log();
  }

  if (largeFiles.length > 0) {
    console.log(`❌ 错误：${largeFiles.length} 个文件超过 ${MAX_FILE_LINES} 行（必须拆分）:`);
    largeFiles
      .sort((a, b) => b.lines - a.lines)
      .forEach((f) => {
        console.log(`   ${f.path}: ${f.lines} 行`);
        issues.push({
          type: "file_size",
          file: f.path,
          lines: f.lines,
        });
      });
    console.log();
  }

  if (complexFiles.length > 0) {
    console.log(
      `⚠️  警告：${complexFiles.length} 个文件圈复杂度超过 ${MAX_COMPLEXITY}:`
    );
    complexFiles
      .sort((a, b) => b.complexity - a.complexity)
      .forEach((f) => {
        console.log(`   ${f.path}: 复杂度 ${f.complexity}`);
      });
    console.log();
  }

  // 输出最大的文件
  console.log(`📈 Top 10 最大文件:`);
  files
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 10)
    .forEach((f, i) => {
      console.log(`   ${i + 1}. ${f.path}: ${f.lines} 行`);
    });
  console.log();

  // 退出码
  if (issues.length > 0) {
    console.log(`❌ 发现 ${issues.length} 个问题，请修复后再提交`);
    process.exit(1);
  } else {
    console.log(`✅ 代码质量检查通过`);
    process.exit(0);
  }
}

main().catch((error) => {
  console.error("❌ 检查失败:", error);
  process.exit(1);
});

