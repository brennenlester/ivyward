import { describe, expect, it } from "vitest";
import {
  walkBobOffset,
  walkFootfallsSince,
  walkStrideFrame,
} from "./playerWalk";

describe("walkStrideFrame", () => {
  it("alternates contact poses across a cycle", () => {
    expect(walkStrideFrame(0)).toBe(1);
    expect(walkStrideFrame(0.25)).toBe(1);
    expect(walkStrideFrame(0.5)).toBe(2);
    expect(walkStrideFrame(0.75)).toBe(2);
    expect(walkStrideFrame(1)).toBe(1);
    expect(walkStrideFrame(1.6)).toBe(2);
  });
});

describe("walkBobOffset", () => {
  it("is low at contacts and peaks mid-pass", () => {
    expect(walkBobOffset(0, 2)).toBeCloseTo(0);
    expect(walkBobOffset(0.5, 2)).toBeCloseTo(0);
    expect(walkBobOffset(0.25, 2)).toBeCloseTo(-2);
    expect(walkBobOffset(0.75, 2)).toBeCloseTo(-2);
  });
});

describe("walkFootfallsSince", () => {
  it("counts footfalls crossed by phase advance", () => {
    expect(walkFootfallsSince(0, 0.4)).toBe(0);
    expect(walkFootfallsSince(0.4, 0.6)).toBe(1);
    expect(walkFootfallsSince(0.9, 1.6)).toBe(2);
  });
});
