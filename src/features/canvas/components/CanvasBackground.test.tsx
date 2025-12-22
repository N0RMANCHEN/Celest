import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CanvasBackground } from "./CanvasBackground";

describe("CanvasBackground", () => {
  it("renders pattern with offsets and spacing", () => {
    const { container } = render(
      <svg>
        <CanvasBackground depthFactor={1.2} offsetX={5} offsetY={7} />
      </svg>
    );

    const pattern = container.querySelector("pattern");
    expect(pattern).toBeTruthy();
    expect(pattern?.getAttribute("x")).toBe("5");
    expect(pattern?.getAttribute("y")).toBe("7");
    expect(pattern?.getAttribute("width")).toBeDefined();
    expect(pattern?.getAttribute("height")).toBeDefined();
  });
});


