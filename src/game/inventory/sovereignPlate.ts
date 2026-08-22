import { ownsSovereignPlate } from "./playerInventory";
import { isSovereignPlateActive } from "../world/worldState";

/** Wild-encounter suppress when the plate is owned and toggled On (#289). */
export function isSovereignPlateSuppressingWild(): boolean {
  return ownsSovereignPlate() && isSovereignPlateActive();
}
