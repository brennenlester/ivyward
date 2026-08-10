# Ivyward

A browser folklore RPG: explore isometric zones, befriend creatures, spar for materials, craft at Moon Shrine, then invite friends into your world.

**Play:** [ivyward-brennen1.vercel.app](https://ivyward-brennen1.vercel.app)

---

## How to play

### Controls

| Input | Action |
| --- | --- |
| **Arrow keys** or **WASD** | Move (hold to keep walking) |
| **E** | Interact — open Moon Shrine on the moon altar, enter a cottage door, or talk to a villager |
| **I** | Copy a friend invite link (host only) |
| **Codex** (status panel) | Open the habitat codex — what lives where (fills in as you encounter creatures) |
| **Reset game** (status panel) | Wipe local host save and start fresh |

### Confined region

Start in **Whisper Grove**, then walk map exits through **Moon Shrine** to **Hearth Crossing**. North of the village are **Folklore Fields**, connected **Mistwood Reach**, and **Emberfen Hollow**, locked until Story quest 2 is complete.

### Story quests

The HUD shows `Story N/4: …` and a short “Next” hint. Host progress saves automatically.

1. **Befriend a wild creature** — walk until an encounter appears, then choose **Befriend**.
2. **Win a training spar** — choose **Spar** and win. This **opens the overworld gate**.
3. **Reach Hearth Crossing** — follow the path Grove → Shrine → Village.
4. **Craft a relic at Moon Shrine** — stand on the moon altar, press **E**, craft any relic.

Gate status reads `Overworld gate: LOCKED (Story 2/4)` until the spar quest is done, then `OPEN`.

### Hearth Crossing villagers

Three cottages in the village can be entered. Stand on a cottage door and press **E** to go in; walk back out through the doorway at the bottom of the room to leave. Cottage interiors are safe rooms — no wild creatures spawn there.

Each cottage is home to one villager you can talk to with **E**:

| Villager | Home | First-visit gift |
| --- | --- | --- |
| Warden Bryn | Warden's Cottage | Wild Fiber ×3 |
| Weaver Sable | Weaver's Cottage | Moss Fiber ×3 |
| Hearthkeep Odd | Hearthkeep Cottage | Brook Tonic ×1 |

A villager hands over their gift the first time you speak to them, once per save. After that they cycle through local talk — some of which is worth listening to. Visitors on an invite link can explore the cottages and talk to everyone, but never receive gifts.

### Encounters and crafting

- Walk in zones to trigger encounters: **Befriend**, **Spar**, or **Flee**.
- Creatures and moves have folklore **types**. Spars use accuracy, hunter matchups (~1.5×), and rare immunity traits on signature creatures.
- Winning spars grants creature materials, Folklore Dust, and XP.
- At Moon Shrine, craft relics and apply shrine effects to party creatures (attack buffs can add a typed dual move, including a 5th move slot).
- Open **Codex** to see which creatures live where. Encountering a creature once lists it under **every** habitat that can spawn it. Habitats with no known dwellers stay blank until you meet something from that pool.

### Secrets

The game hides one achievement. It is never listed, counted, or named in the UI before you earn it — the story hints and the codex only nudge you toward it.

<details>
<summary>Spoiler</summary>

Filling every codex page (all 11 creatures that appear in habitat encounter tables) unlocks **Codex Keeper** and grants **Brook Tonic ×5** and **Moonwake Draught ×5** — five heals and five revives. It awards once per save. `Bramblewarden` and `Hearthflame` are evolution-only and are not required.

</details>

### Friend invites

1. As **host**, press **I** to copy an invite URL (party, inventory, quests, and position).
2. Open the link in another browser/tab to join as a **visitor**.
3. Visitors can explore the host snapshot but **cannot** trigger encounters, craft, or advance quests.
4. Broken or tampered `?join=` links show an error screen and do not change your local save.

### Save and resume

Host progress (party, inventory, quests, position, gate) lives in `localStorage`. Append `?new=1` or use **Reset game** to start over. A valid `?join=` invite always takes precedence over the local save.

---

## Development

**Requirements:** Node.js 20.9+ and npm.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # Vitest unit tests
npm run build    # production build → dist/
npm run preview  # serve dist locally
npm run pack:atlas  # rebuild Imagine texture atlas after adding/replacing PNGs
```

Pull requests to `main` run CI (`npm ci`, `npm test`, `npm run build`). Merges deploy via Vercel.

### Dev-only cheats

These are for local development only; they are not part of normal play:

- **U** — toggle the overworld gate without completing Story 2
- `?encounter=<creatureId>` / `?spar=<creatureId>` — launch a preview encounter/spar in the Vite dev server

### Project layout

- `src/game/` — Phaser bootstrap and scenes
- `src/game/story/` — quest definitions and progress
- `src/game/world/` — zones, collision, invites, saves
- `src/game/creatures/` — catalog and party
- `src/game/inventory/` / `src/game/crafting/` / `src/game/shrine/` — materials and Moon Shrine
- `AGENTS.md` — agent workflow conventions

## License

Private project.
