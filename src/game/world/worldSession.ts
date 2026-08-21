import { clearPlayerName } from "./playerName";

export type SessionRole = "host" | "visitor";

let role: SessionRole = "host";
let hostLabel = "Your world";

export function setVisitorMode(enabled: boolean, label = "Friend's world"): void {
  role = enabled ? "visitor" : "host";
  hostLabel = enabled ? label : "Your world";
  // Invite snapshots may carry the host's playerName; visitors name themselves.
  if (enabled) {
    clearPlayerName();
  }
}

export function isVisitorMode(): boolean {
  return role === "visitor";
}

export function getSessionRole(): SessionRole {
  return role;
}

export function getHostLabel(): string {
  return hostLabel;
}
