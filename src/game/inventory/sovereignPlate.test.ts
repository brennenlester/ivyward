import { beforeEach, describe, expect, it } from "vitest";
import { setInventoryFromSnapshot } from "./playerInventory";
import { isSovereignPlateSuppressingWild } from "./sovereignPlate";
import { setSovereignPlateActive } from "../world/worldState";

describe("sovereign plate wild suppress", () => {
  beforeEach(() => {
    setInventoryFromSnapshot({}, {});
    setSovereignPlateActive(false, false);
  });

  it("requires both ownership and an active toggle", () => {
    expect(isSovereignPlateSuppressingWild()).toBe(false);
    setSovereignPlateActive(true, false);
    expect(isSovereignPlateSuppressingWild()).toBe(false);
    setInventoryFromSnapshot({}, { "sovereign-plate": 1 });
    expect(isSovereignPlateSuppressingWild()).toBe(true);
    setSovereignPlateActive(false, false);
    expect(isSovereignPlateSuppressingWild()).toBe(false);
  });
});
