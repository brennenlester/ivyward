import { beforeEach, describe, expect, it } from "vitest";
import {
  ENCOUNTER_IMMUNITY_MS,
  grantEncounterImmunity,
  isEncounterImmune,
  resetEncounterImmunity,
} from "./encounterImmunity";

beforeEach(() => {
  resetEncounterImmunity();
});

describe("encounter immunity", () => {
  it("blocks rolls for 3 seconds after grant", () => {
    grantEncounterImmunity(1_000);
    expect(isEncounterImmune(1_000)).toBe(true);
    expect(isEncounterImmune(1_000 + ENCOUNTER_IMMUNITY_MS - 1)).toBe(true);
    expect(isEncounterImmune(1_000 + ENCOUNTER_IMMUNITY_MS)).toBe(false);
  });

  it("extends immunity when granted again", () => {
    grantEncounterImmunity(0);
    grantEncounterImmunity(2_500);
    expect(isEncounterImmune(2_500 + ENCOUNTER_IMMUNITY_MS - 1)).toBe(true);
    expect(isEncounterImmune(2_500 + ENCOUNTER_IMMUNITY_MS)).toBe(false);
  });
});
