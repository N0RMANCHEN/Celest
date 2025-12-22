import { describe, expect, it, vi, beforeEach } from "vitest";

function mockConsoles() {
  const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
  const info = vi.spyOn(console, "info").mockImplementation(() => {});
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  return { debug, info, warn, error };
}

describe("logger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("dev 默认（debug 级别）应全部输出", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_LOG_LEVEL", "");
    const spies = mockConsoles();
    const { logger } = await import("./logger");

    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");

    expect(spies.debug).toHaveBeenCalledTimes(1);
    expect(spies.info).toHaveBeenCalledTimes(1);
    expect(spies.warn).toHaveBeenCalledTimes(1);
    expect(spies.error).toHaveBeenCalledTimes(1);
  });

  it("VITE_LOG_LEVEL=warn 时仅输出 warn+error", async () => {
    vi.stubEnv("VITE_LOG_LEVEL", "warn");
    const spies = mockConsoles();
    const { logger } = await import("./logger");

    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");

    expect(spies.debug).not.toHaveBeenCalled();
    expect(spies.info).not.toHaveBeenCalled();
    expect(spies.warn).toHaveBeenCalledTimes(1);
    expect(spies.error).toHaveBeenCalledTimes(1);
  });

  it("生产默认（DEV=false）只输出 error", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VITE_LOG_LEVEL", "error");
    const spies = mockConsoles();
    const { logger } = await import("./logger");

    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");

    expect(spies.debug).not.toHaveBeenCalled();
    expect(spies.info).not.toHaveBeenCalled();
    expect(spies.warn).not.toHaveBeenCalled();
    expect(spies.error).toHaveBeenCalledTimes(1);
  });
});

