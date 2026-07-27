import type { FolkloreType } from "./folkloreTypes";
import { getImmunityTo } from "./folkloreTypes";

export type CreatureTrait =
  | { kind: "immunity"; to: FolkloreType }
  | { kind: "damage-buff"; moveId: string; multiplier: number };

export type SignatureTraitKit = {
  /** Move that receives the damage-buff outcome. */
  signatureMoveId: string;
  /** Damage-buff strength when that outcome is rolled (~25–40%). */
  damageBuffMultiplier: number;
};

/** Signature species that come with a buff pool (styrofoam-in-the-box). */
export const SIGNATURE_TRAIT_KITS: Readonly<
  Record<string, SignatureTraitKit>
> = {
  "mist-serpent": {
    signatureMoveId: "coil",
    damageBuffMultiplier: 1.35,
  },
  "stone-hound": {
    signatureMoveId: "ram",
    damageBuffMultiplier: 1.3,
  },
  "lantern-fox": {
    signatureMoveId: "dash",
    damageBuffMultiplier: 1.35,
  },
  "bog-lantern": {
    signatureMoveId: "lure",
    damageBuffMultiplier: 1.3,
  },
};

export function isSignatureSpecies(speciesId: string): boolean {
  return speciesId in SIGNATURE_TRAIT_KITS;
}

/**
 * 50/50 immunity vs signature-move damage buff — only for buff-capable species.
 * Immunity `to` comes from the type chart for that creature's battle type.
 */
export function rollSignatureTrait(
  speciesId: string,
  folkloreType: FolkloreType,
  rng: () => number = Math.random,
): CreatureTrait | undefined {
  const kit = SIGNATURE_TRAIT_KITS[speciesId];
  if (!kit) {
    return undefined;
  }

  const wantsImmunity = rng() < 0.5;
  if (wantsImmunity) {
    const to = getImmunityTo(folkloreType);
    if (to) {
      return { kind: "immunity", to };
    }
    // Type has no chart immunity — fall through to damage buff.
  }

  return {
    kind: "damage-buff",
    moveId: kit.signatureMoveId,
    multiplier: kit.damageBuffMultiplier,
  };
}

export function formatTraitLabel(trait: CreatureTrait | undefined): string {
  if (!trait) {
    return "";
  }
  if (trait.kind === "immunity") {
    return `immune:${trait.to}`;
  }
  return `sig:${trait.moveId}+${Math.round((trait.multiplier - 1) * 100)}%`;
}
