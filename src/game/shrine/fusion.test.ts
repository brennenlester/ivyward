import { beforeEach, describe, expect, it } from "vitest";
import { getCreatureDefinition } from "../creatures/catalog";
import { playerParty, setPartyFromSnapshot } from "../creatures/party";
import type { CreatureInstance } from "../creatures/types";
import {
  getItemCount,
  setInventoryFromSnapshot,
} from "../inventory/playerInventory";
import { LEVEL_XP_THRESHOLDS } from "../progression/leveling";
import {
  applyWorldSnapshot,
  exportWorldSnapshot,
  type WorldSnapshot,
} from "../world/worldSnapshot";
import { setVisitorMode } from "../world/worldSession";
import { applyShrineFusion } from "./fusion";
import { effectKey } from "./shrineEffects";
import {
  hasPresenceGrowth,
  presenceTintColor,
  presenceTintForCreature,
} from "./presence";

function member(
  overrides: Partial<CreatureInstance> &
    Pick<CreatureInstance, "instanceId" | "definitionId">,
): CreatureInstance {
  return {
    speciesId: overrides.definitionId,
    currentHp: 28,
    level: 5,
    xp: LEVEL_XP_THRESHOLDS[5],
    ...overrides,
  };
}

describe("Growth unlock fusion (#296)", () => {
  beforeEach(() => {
    setPartyFromSnapshot([], 1);
    setInventoryFromSnapshot({}, {});
    setVisitorMode(false);
  });

  it("evolves mossling with moss-salve and persists through save round-trip", () => {
    const mossling = member({ instanceId: "c-m", definitionId: "mossling" });
    setPartyFromSnapshot([mossling], 1);
    setInventoryFromSnapshot({}, { "moss-salve": 1 });

    expect(applyShrineFusion(mossling.instanceId, "moss-salve")).toEqual({
      ok: true,
      message: "Mossling evolved into Bramblewarden!",
    });
    const evolved = playerParty.creatures.find(
      (c) => c.instanceId === mossling.instanceId,
    )!;
    expect(evolved.definitionId).toBe("bramblewarden");
    expect(evolved.appliedEffects).toContain(
      effectKey("mossling", "moss-salve"),
    );

    const snapshot = exportWorldSnapshot({ zoneId: "grove", x: 3, y: 7 });
    setPartyFromSnapshot([], 1);
    applyWorldSnapshot(snapshot);
    const restored = playerParty.creatures.find(
      (c) => c.instanceId === mossling.instanceId,
    );
    expect(restored?.definitionId).toBe("bramblewarden");
    expect(restored?.appliedEffects).toContain(
      effectKey("mossling", "moss-salve"),
    );
  });

  it("applies presence to lantern-fox and round-trips appliedEffects", () => {
    const fox = member({ instanceId: "c-f", definitionId: "lantern-fox" });
    setPartyFromSnapshot([fox], 1);
    setInventoryFromSnapshot({}, { "fox-fire-charm": 1 });

    expect(applyShrineFusion(fox.instanceId, "fox-fire-charm")).toEqual({
      ok: true,
      message: "Lantern Fox shows a new presence in the world!",
    });
    const updated = playerParty.creatures.find(
      (c) => c.instanceId === fox.instanceId,
    )!;
    expect(hasPresenceGrowth(updated)).toBe(true);

    const snapshot = exportWorldSnapshot({ zoneId: "grove", x: 3, y: 7 });
    setPartyFromSnapshot([], 1);
    applyWorldSnapshot(snapshot);
    const restored = playerParty.creatures.find(
      (c) => c.instanceId === fox.instanceId,
    );
    expect(hasPresenceGrowth(restored!)).toBe(true);
  });

  it("rejects visitors, double-apply, wrong creature, and missing item", () => {
    const fox = member({ instanceId: "c-f", definitionId: "lantern-fox" });
    setPartyFromSnapshot([fox], 1);
    setInventoryFromSnapshot({}, { "fox-fire-charm": 1 });

    setVisitorMode(true);
    expect(applyShrineFusion(fox.instanceId, "fox-fire-charm")).toEqual({
      ok: false,
      message: "Visitors cannot apply shrine effects.",
    });
    setVisitorMode(false);

    expect(applyShrineFusion(fox.instanceId, "fox-fire-charm").ok).toBe(true);
    expect(applyShrineFusion(fox.instanceId, "fox-fire-charm")).toEqual({
      ok: false,
      message: "This fusion was already applied.",
    });

    const mossling = member({ instanceId: "c-m", definitionId: "mossling" });
    setPartyFromSnapshot([mossling], 1);
    expect(applyShrineFusion(mossling.instanceId, "fox-fire-charm")).toEqual({
      ok: false,
      message: "This item has no effect on that creature.",
    });

    setInventoryFromSnapshot({}, {});
    expect(applyShrineFusion(mossling.instanceId, "moss-salve")).toEqual({
      ok: false,
      message: "You don't have that item.",
    });
  });
});

describe("presence overworld tell seam (#296)", () => {
  it("brightens spriteColor only when presence growth is applied", () => {
    const fox = member({ instanceId: "c-f", definitionId: "lantern-fox" });
    const base = getCreatureDefinition("lantern-fox").spriteColor;
    expect(presenceTintForCreature(fox)).toBe(base);

    fox.appliedEffects = [effectKey("lantern-fox", "fox-fire-charm")];
    expect(hasPresenceGrowth(fox)).toBe(true);
    expect(presenceTintForCreature(fox)).toBe(presenceTintColor(base));
    expect(presenceTintForCreature(fox)).not.toBe(base);
  });
});
