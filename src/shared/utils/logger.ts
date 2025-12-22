/**
 * shared/utils/logger.ts
 * ----------------------
 * 统一日志入口，按环境控制输出级别。
 *
 * 默认：开发环境 "debug"；生产环境 "error"（只输出错误）。
 * 可通过 VITE_LOG_LEVEL=debug|info|warn|error 覆盖。
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function parseLevel(level?: string | null): LogLevel | null {
  if (!level) return null;
  const normalized = level.toLowerCase();
  if (normalized === "debug" || normalized === "info" || normalized === "warn" || normalized === "error") {
    return normalized;
  }
  return null;
}

function getActiveLevel(): LogLevel {
  const hasProcess = typeof process !== "undefined";
  const procEnv = hasProcess ? process.env : undefined;

  // 测试可用 process.env.DEV 强制覆盖；否则使用 import.meta.env.DEV
  const isDev =
    (procEnv?.DEV ?? "") === "true" ||
    import.meta.env.DEV === true ||
    procEnv?.NODE_ENV === "test";

  const level =
    procEnv?.VITE_LOG_LEVEL ??
    (import.meta.env.VITE_LOG_LEVEL as string | undefined) ??
    null;

  return parseLevel(level) ?? (isDev ? "debug" : "error");
}

function shouldLog(level: LogLevel): boolean {
  const activeLevel = getActiveLevel();
  return levelOrder[level] >= levelOrder[activeLevel];
}

function emit(level: LogLevel, ...args: unknown[]) {
  if (!shouldLog(level)) return;

  switch (level) {
    case "debug":
      console.debug(...args);
      break;
    case "info":
      console.info(...args);
      break;
    case "warn":
      console.warn(...args);
      break;
    case "error":
    default:
      console.error(...args);
      break;
  }
}

export const logger = {
  debug: (...args: unknown[]) => emit("debug", ...args),
  info: (...args: unknown[]) => emit("info", ...args),
  warn: (...args: unknown[]) => emit("warn", ...args),
  error: (...args: unknown[]) => emit("error", ...args),
};

