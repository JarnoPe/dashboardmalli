import { describe, expect, it } from "vitest";
import { airQualityStatus, welfareStatus } from "./analytics";
import { getSleipData } from "./api";
import { ANCHOR, DAY } from "./mock-data";

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

describe("airQualityStatus", () => {
  it("is good below every attention threshold", () => {
    expect(airQualityStatus(900, 8, 18)).toBe("Hyvä");
  });
  it("requires attention when carbon dioxide exceeds 1,000 ppm", () => {
    expect(airQualityStatus(1001, 8, 18)).toBe("Huomio");
  });
  it("is poor when ammonia exceeds 15 ppm", () => {
    expect(airQualityStatus(900, 15.1, 18)).toBe("Heikko");
  });
});

describe("SLEIP demo data", () => {
  it("returns seven movement sessions for a seven-day range", () => {
    const data = getSleipData("Antero", ANCHOR - 7 * DAY, ANCHOR);
    expect(data.sessions).toHaveLength(7);
    expect(data.latest.symmetry).toBeGreaterThan(90);
  });
});
