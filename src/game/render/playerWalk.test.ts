import { describe, expect, it } from "vitest";
import {
  walkBobOffset,
  walkFootfallsSince,
  walkStrideFrame,
} from "./playerWalk";

describe("walkStrideFrame", () => {
  it("maps a 2-pose cycle across the gait phase", () => {
    expect(walkStrideFrame(0, 2)).toBe(1);
    expect(walkStrideFrame(0.25, 2)).toBe(1);
    expect(walkStrideFrame(0.5, 2)).toBe(2);
    expect(walkStrideFrame(0.75, 2)).toBe(2);
    expect(walkStrideFrame(1, 2)).toBe(1);
    expect(walkStrideFrame(1.6, 2)).toBe(2);
  });

  it("maps a 4-pose E/W cycle across the gait phase", () => {
    expect(walkStrideFrame(0, 4)).toBe(1);
    expect(walkStrideFrame(0.24, 4)).toBe(1);
    expect(walkStrideFrame(0.25, 4)).toBe(2);
    expect(walkStrideFrame(0.49, 4)).toBe(2);
    expect(walkStrideFrame(0.5, 4)).toBe(3);
    expect(walkStrideFrame(0.74, 4)).toBe(3);
    expect(walkStrideFrame(0.75, 4)).toBe(4);
    expect(walkStrideFrame(0.99, 4)).toBe(4);
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
