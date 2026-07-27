import { getCreatureDefinition } from "../creatures/catalog";
import { getCreaturesForZone, ZONE_ENCOUNTERS } from "../encounters/tables";
import { worldState } from "../world/worldState";
import { ZONES } from "../world/zones";
import type { ZoneId } from "../world/zoneTypes";

let codexOpen = false;

function ensureCodexRoot(): HTMLElement {
  let root = document.getElementById("codex-overlay");
  if (root) {
    return root;
  }
  root = document.createElement("div");
  root.id = "codex-overlay";
  root.className = "codex-overlay";
  root.hidden = true;
  root.innerHTML = `
    <div class="codex-panel" role="dialog" aria-labelledby="codex-title">
      <div class="codex-header">
        <h2 id="codex-title">Creature Codex</h2>
        <button type="button" id="codex-close" class="codex-close">Close</button>
      </div>
      <p class="codex-intro">What lives where — unlocks as you explore.</p>
      <div id="codex-body" class="codex-body"></div>
    </div>
  `;
  document.getElementById("app")?.appendChild(root);
  root.querySelector("#codex-close")?.addEventListener("click", closeCodex);
  root.addEventListener("click", (event) => {
    if (event.target === root) {
      closeCodex();
    }
  });
  return root;
}

function renderCodexBody(): void {
  const body = document.getElementById("codex-body");
  if (!body) {
    return;
  }
  const discovered = new Set(worldState.discoveredZones);
  const zoneIds = Object.keys(ZONE_ENCOUNTERS) as ZoneId[];

  if (discovered.size === 0) {
    body.innerHTML =
      "<p class=\"codex-empty\">Explore a zone to learn what dwells there.</p>";
    return;
  }

  body.innerHTML = zoneIds
    .map((zoneId) => {
      const zone = ZONES[zoneId];
      if (!discovered.has(zoneId)) {
        return `<section class="codex-zone codex-zone-locked">
          <h3>${zone.name}</h3>
          <p>Not yet explored.</p>
        </section>`;
      }
      const creatures = getCreaturesForZone(zoneId)
        .map((id) => {
          const def = getCreatureDefinition(id);
          return `<li><strong>${def.name}</strong> <span class="codex-type">${def.folkloreType}</span></li>`;
        })
        .join("");
      return `<section class="codex-zone">
        <h3>${zone.name}</h3>
        <ul>${creatures}</ul>
      </section>`;
    })
    .join("");
}

export function openCodex(): void {
  const root = ensureCodexRoot();
  renderCodexBody();
  root.hidden = false;
  codexOpen = true;
}

export function closeCodex(): void {
  const root = document.getElementById("codex-overlay");
  if (root) {
    root.hidden = true;
  }
  codexOpen = false;
}

export function toggleCodex(): void {
  if (codexOpen) {
    closeCodex();
  } else {
    openCodex();
  }
}

export function isCodexOpen(): boolean {
  return codexOpen;
}
