import { getHostLabel, isVisitorMode } from "./worldSession";
import type { WorldSnapshot } from "./worldSnapshot";
import { HARBOR_PIER } from "./dockBoat";
import {
  exportWorldSnapshot,
  isValidWorldSnapshot,
  migrateBoatStateToHarbor,
  repairLegacyOverworldShorePosition,
} from "./worldSnapshot";
import type { ZoneId } from "./zoneTypes";

/** Visitors cannot sail; mid-sail invites must land on the Harbor pier on foot. */
export function normalizeInviteSailingSnapshot(snapshot: WorldSnapshot): void {
  if (snapshot.sailing !== true) {
    return;
  }
  snapshot.sailing = false;
  snapshot.position = {
    zoneId: "harbor",
    x: HARBOR_PIER.x,
    y: HARBOR_PIER.y,
  };
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLength);
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function buildInviteUrl(
  zoneId: ZoneId,
  x: number,
  y: number,
): string {
  const snapshot = exportWorldSnapshot(
    { zoneId, x, y },
    getHostLabel(),
  );
  normalizeInviteSailingSnapshot(snapshot);
  const encoded = toBase64Url(JSON.stringify(snapshot));
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("join", encoded);
  return url.toString();
}

export type InviteParseResult =
  | { status: "absent" }
  | { status: "invalid" }
  | { status: "ok"; snapshot: WorldSnapshot };

/** Distinguish missing vs broken `?join=` so callers can show an error screen. */
export function parseInviteParam(): InviteParseResult {
  const encoded = new URLSearchParams(window.location.search).get("join");
  if (encoded === null) {
    return { status: "absent" };
  }
  if (encoded.trim() === "") {
    return { status: "invalid" };
  }

  try {
    const parsed = JSON.parse(fromBase64Url(encoded));
    migrateBoatStateToHarbor(parsed);
    repairLegacyOverworldShorePosition(parsed);
    if (!isValidWorldSnapshot(parsed)) {
      return { status: "invalid" };
    }
    normalizeInviteSailingSnapshot(parsed);
    return { status: "ok", snapshot: parsed };
  } catch {
    return { status: "invalid" };
  }
}

export function parseInviteFromUrl(): WorldSnapshot | null {
  const result = parseInviteParam();
  return result.status === "ok" ? result.snapshot : null;
}

export function clearJoinParamAndReload(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete("join");
  url.searchParams.delete("new");
  const query = url.searchParams.toString();
  window.location.replace(`${url.pathname}${query ? `?${query}` : ""}${url.hash}`);
}

export async function copyInviteLink(
  zoneId: ZoneId,
  x: number,
  y: number,
): Promise<string> {
  if (isVisitorMode()) {
    throw new Error("Visitors cannot create invite links");
  }

  const url = buildInviteUrl(zoneId, x, y);
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
  }
  return url;
}
