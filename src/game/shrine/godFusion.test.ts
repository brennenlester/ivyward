import { beforeEach, describe, expect, it } from "vitest";
import { getCreatureDefinition } from "../creatures/catalog";
import {
  addToParty,
  hasCreature,
  playerParty,
  setPartyFromSnapshot,
} from "../creatures/party";
import type { CreatureInstance } from "../creatures/types";
import {
  getItemCount,
  setInventoryFromSnapshot,
} from "../inventory/playerInventory";
import { LEVEL_XP_THRESHOLDS } from "../progression/leveling";
import { applyShrineFusion } from "./fusion";
import {
  applyGodFusion,
  HORIZON_SOVEREIGN_ID,
  SOVEREIGN_SEAL_ID,
} from "./godFusion";
import { CAIRN_SOVEREIGN_ID } from "../encounters/godLand";
import { TIDE_SOVEREIGN_ID } from "../encounters/godSail";
import { setVisitorMode } from "../world/worldSession";
import {
  isGodFusionCompleted,
  setGodFusionCompleted,
} from "../world/worldState";

function member(
  overrides: Partial<CreatureInstance> &
    Pick<CreatureInstance, "instanceId" | "definitionId">,
): CreatureInstance {
  return {
    speciesId: overrides.definitionId,
    currentHp: 10,
    level: 1,
    xp: 0,
    ...overrides,
  };
}

describe("dual-god fusion", () => {
  beforeEach(() => {
    setPartyFromSnapshot([], 1);
    setInventoryFromSnapshot({}, {});
    setVisitorMode(false);
    setGodFusionCompleted(false, false);
  });

  it("refuses visitors, missing seal, missing gods, and the wrong item", () => {
    setPartyFromSnapshot(
      [
        member({ instanceId: "t", definitionId: TIDE_SOVEREIGN_ID, level: 40 }),
        member({ instanceId: "c", definitionId: CAIRN_SOVEREIGN_ID, level: 30 }),
      ],
      3,
    );
    setInventoryFromSnapshot({}, { [SOVEREIGN_SEAL_ID]: 1 });

    setVisitorMode(true);
    expect(applyGodFusion("t", "c", SOVEREIGN_SEAL_ID).ok).toBe(false);
    setVisitorMode(false);

    expect(applyGodFusion("t", "c", "ember-charm").ok).toBe(false);
    expect(applyGodFusion("t", "c", SOVEREIGN_SEAL_ID).ok).toBe(true);

    setGodFusionCompleted(false, false);
    setInventoryFromSnapshot({}, {});
    setPartyFromSnapshot(
      [
        member({ instanceId: "t", definitionId: TIDE_SOVEREIGN_ID }),
        member({ instanceId: "c", definitionId: CAIRN_SOVEREIGN_ID }),
      ],
      3,
    );
    expect(applyGodFusion("t", "c", SOVEREIGN_SEAL_ID).message).toBe(
      "You need a Sovereign Seal.",
    );

    setInventoryFromSnapshot({}, { [SOVEREIGN_SEAL_ID]: 1 });
    setPartyFromSnapshot(
      [member({ instanceId: "t", definitionId: TIDE_SOVEREIGN_ID })],
      2,
    );
    expect(applyGodFusion("t", "missing", SOVEREIGN_SEAL_ID).message).toMatch(
      /Requires Tide Sovereign and Cairn Sovereign/,
    );
  });

  it("refuses a second fusion after completion", () => {
    setGodFusionCompleted(true, false);
    setPartyFromSnapshot(
      [
        member({ instanceId: "t", definitionId: TIDE_SOVEREIGN_ID }),
        member({ instanceId: "c", definitionId: CAIRN_SOVEREIGN_ID }),
      ],
      3,
    );
    setInventoryFromSnapshot({}, { [SOVEREIGN_SEAL_ID]: 1 });
    expect(applyGodFusion("t", "c", SOVEREIGN_SEAL_ID)).toEqual({
      ok: false,
      message: "The sovereigns have already been fused.",
    });
    expect(getItemCount(SOVEREIGN_SEAL_ID)).toBe(1);
    expect(hasCreature(TIDE_SOVEREIGN_ID)).toBe(true);
  });

  it("consumes both parents and the seal, then adds Horizon Sovereign", () => {
    setPartyFromSnapshot(
      [
        member({
          instanceId: "t",
          definitionId: TIDE_SOVEREIGN_ID,
          level: 40,
          currentHp: 0,
        }),
        member({
          instanceId: "c",
          definitionId: CAIRN_SOVEREIGN_ID,
          level: 47,
          currentHp: 0,
        }),
      ],
      3,
    );
    setInventoryFromSnapshot(
      {},
      { [SOVEREIGN_SEAL_ID]: 1, "tide-cleaver": 1, "cairn-maul": 1 },
    );

    const result = applyGodFusion("t", "c", SOVEREIGN_SEAL_ID);
    expect(result).toEqual({
      ok: true,
      message:
        "Tide Sovereign and Cairn Sovereign fused into Horizon Sovereign!",
    });
    expect(hasCreature(TIDE_SOVEREIGN_ID)).toBe(false);
    expect(hasCreature(CAIRN_SOVEREIGN_ID)).toBe(false);
    expect(hasCreature(HORIZON_SOVEREIGN_ID)).toBe(true);
    expect(getItemCount(SOVEREIGN_SEAL_ID)).toBe(0);
    expect(getItemCount("tide-cleaver")).toBe(1);
    expect(getItemCount("cairn-maul")).toBe(1);
    expect(isGodFusionCompleted()).toBe(true);

    const fused = playerParty.creatures[0];
    expect(fused).toMatchObject({
      definitionId: HORIZON_SOVEREIGN_ID,
      level: 47,
      xp: LEVEL_XP_THRESHOLDS[47],
      currentHp: getCreatureDefinition(HORIZON_SOVEREIGN_ID).maxHp,
    });
    expect(fused?.attackBonus).toBeUndefined();
    expect(fused?.hpBonus).toBeUndefined();
    expect(fused?.appliedEffects).toBeUndefined();
    expect(getCreatureDefinition(HORIZON_SOVEREIGN_ID).excludeFromCodex).toBe(
      true,
    );
  });

  it("leaves ember-charm fusion working", () => {
    addToParty("mossling");
    const mossling = playerParty.creatures[0]!;
    mossling.level = 3;
    setInventoryFromSnapshot({}, { "ember-charm": 1 });
    const result = applyShrineFusion(mossling.instanceId, "ember-charm");
    expect(result.ok).toBe(true);
    expect(mossling.secondaryMove?.id).toBe("ember-lash");
  });
});
