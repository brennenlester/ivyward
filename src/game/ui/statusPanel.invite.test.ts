import { afterEach, describe, expect, it, vi } from "vitest";

describe("Copy invite link status control", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.resetModules();
  });

  it("keeps Copy invite hidden for hosts even after a handler is registered", async () => {
    document.body.innerHTML = `
      <button id="copy-invite-btn" type="button">Copy invite link</button>
      <button id="reset-game-btn" type="button">Reset game</button>
      <button id="codex-btn" type="button">Codex</button>
      <button id="party-btn" type="button">Party</button>
      <button id="inventory-btn" type="button">Inventory</button>
    `;
    const session = await import("../world/worldSession");
    const mod = await import("./statusPanel");
    session.setVisitorMode(false);
    mod.initStatusPanelControls();

    const btn = document.getElementById("copy-invite-btn") as HTMLButtonElement;
    expect(btn.hidden).toBe(true);
    expect(btn.disabled).toBe(true);

    const handler = vi.fn();
    mod.setCopyInviteHandler(handler);
    expect(btn.hidden).toBe(true);
    expect(btn.disabled).toBe(true);
    btn.click();
    expect(handler).not.toHaveBeenCalled();
  });

  it("does not enable Copy invite when a handler is registered first", async () => {
    document.body.innerHTML = `
      <button id="copy-invite-btn" type="button">Copy invite link</button>
      <button id="reset-game-btn" type="button">Reset game</button>
      <button id="codex-btn" type="button">Codex</button>
      <button id="party-btn" type="button">Party</button>
      <button id="inventory-btn" type="button">Inventory</button>
    `;
    const session = await import("../world/worldSession");
    const mod = await import("./statusPanel");
    session.setVisitorMode(false);
    const handler = vi.fn();
    mod.setCopyInviteHandler(handler);
    mod.initStatusPanelControls();

    const btn = document.getElementById("copy-invite-btn") as HTMLButtonElement;
    expect(btn.hidden).toBe(true);
    expect(btn.disabled).toBe(true);
    btn.click();
    expect(handler).not.toHaveBeenCalled();
  });

  it("hides Copy invite link for visitors and does not call the handler", async () => {
    document.body.innerHTML = `
      <button id="copy-invite-btn" type="button">Copy invite link</button>
      <button id="reset-game-btn" type="button">Reset game</button>
      <button id="codex-btn" type="button">Codex</button>
      <button id="party-btn" type="button">Party</button>
      <button id="inventory-btn" type="button">Inventory</button>
    `;
    const session = await import("../world/worldSession");
    const mod = await import("./statusPanel");
    session.setVisitorMode(true);
    const handler = vi.fn();
    mod.setCopyInviteHandler(handler);
    mod.initStatusPanelControls();

    const btn = document.getElementById("copy-invite-btn") as HTMLButtonElement;
    expect(btn.hidden).toBe(true);
    btn.click();
    expect(handler).not.toHaveBeenCalled();
  });

  it("does not tell hosts to copy an invite link", async () => {
    document.body.innerHTML = `
      <button id="copy-invite-btn" type="button">Copy invite link</button>
      <div id="status-session"></div>
    `;
    const session = await import("../world/worldSession");
    const { getZone } = await import("../world/zones");
    const mod = await import("./statusPanel");
    session.setVisitorMode(false);
    mod.initStatusPanelControls();
    mod.updateStatusPanel(getZone("grove"));
    const sessionEl = document.getElementById("status-session");
    expect(sessionEl?.textContent ?? "").not.toMatch(/invite|share your world/i);
  });
});
