import { describe, expect, it } from "vitest";
import { welfareStatus } from "./analytics";

describe("welfareStatus", () => {
  it("is Green when intake is near baseline and gaps are short", () => {
    expect(welfareStatus(30, 30, 5)).toBe("Green");
  });
  it("is Yellow when intake drops below 85% of baseline", () => {
    expect(welfareStatus(24, 30, 4)).toBe("Yellow");
  });
  it("is Red when a gap exceeds 12 hours", () => {
    expect(welfareStatus(30, 30, 12.5)).toBe("Red");
  });
  it("is Yellow when a gap exceeds 9 hours", () => {
    expect(welfareStatus(30, 30, 9.5)).toBe("Yellow");
  });
  it("is Red when intake is below 70% of baseline", () => {
    expect(welfareStatus(20, 30, 3)).toBe("Red");
  });
});
