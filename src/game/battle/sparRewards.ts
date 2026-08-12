import { getCreatureDefinition } from "../creatures/catalog";
import { getActiveCreatures } from "../creatures/party";
import { getMaterialForCreature, getMaterialName } from "../inventory/materials";
import { addMaterial } from "../inventory/playerInventory";
import { grantSparXp, XP_PER_SPAR_WIN } from "../progression/leveling";
import { recordQuestEvent } from "../story/questProgress";

export type SparRewardSummary = {
  materialId?: string;
  dustGained: number;
  xpGained: number;
  leveledUp: boolean;
  newLevel?: number;
  creatureName?: string;
};

export function grantSparRewards(
  wildCreatureId: string,
  activePartyIndex: number,
): SparRewardSummary {
  const summary: SparRewardSummary = {
    dustGained: 1,
    xpGained: 0,
    leveledUp: false,
  };

  addMaterial("folklore-dust", 1);

  const matId = getMaterialForCreature(wildCreatureId);
  if (matId) {
    addMaterial(matId, 1);
    summary.materialId = matId;
  }

  if (activePartyIndex >= 0) {
    const creature = getActiveCreatures()[activePartyIndex];
    if (creature) {
      const prevLevel = creature.level;
      grantSparXp(creature);
      summary.xpGained = XP_PER_SPAR_WIN;
      summary.leveledUp = creature.level > prevLevel;
      if (summary.leveledUp) {
        summary.newLevel = creature.level;
      }
      summary.creatureName = getCreatureDefinition(creature.definitionId).name;
    }
  }

  recordQuestEvent({ type: "win_spar" });

  return summary;
}

export function formatRewardMessage(reward: SparRewardSummary): string {
  const parts = ["You won the training spar!"];
  if (reward.materialId) {
    parts.push(`+1 ${getMaterialName(reward.materialId)}, +1 Folklore Dust.`);
  } else {
    parts.push(`+1 Folklore Dust.`);
  }
  if (reward.xpGained > 0 && reward.creatureName) {
    parts.push(`${reward.creatureName} +${reward.xpGained} XP.`);
  }
  if (reward.leveledUp && reward.newLevel) {
    parts.push(`Leveled up to Lv.${reward.newLevel}!`);
  }
  return parts.join(" ");
}
