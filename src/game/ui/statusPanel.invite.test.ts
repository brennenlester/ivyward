import { afterEach, describe, expect, it, vi } from "vitest";

describe("Copy invite link status control", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.resetModules();
  });

  it("keeps Copy invite hidden on cold boot even after a handler is registered", async () => {
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

  it("reveals Copy invite after FTUE unlock and calls the handler", async () => {
    document.body.innerHTML = `
      <button id="copy-invite-btn" type="button" hidden>Copy invite link</button>
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
    mod.unlockHostInviteChrome();

    const btn = document.getElementById("copy-invite-btn") as HTMLButtonElement;
    expect(mod.isHostInviteUnlocked()).toBe(true);
    expect(btn.hidden).toBe(false);
    expect(btn.disabled).toBe(false);
    btn.click();
    expect(handler).toHaveBeenCalledTimes(1);
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
    mod.unlockHostInviteChrome();

    const btn = document.getElementById("copy-invite-btn") as HTMLButtonElement;
    expect(btn.hidden).toBe(true);
    btn.click();
    expect(handler).not.toHaveBeenCalled();
  });

  it("does not tell hosts to copy an invite link before unlock", async () => {
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
    expect(sessionEl?.textContent ?? "").toBe("");
    expect(sessionEl?.textContent ?? "").not.toMatch(/invite|share your world/i);
  });

  it("keeps the host default session line empty after invite unlock", async () => {
    document.body.innerHTML = `
      <button id="copy-invite-btn" type="button">Copy invite link</button>
      <div id="status-session"></div>
    `;
    const session = await import("../world/worldSession");
    const { getZone } = await import("../world/zones");
    const mod = await import("./statusPanel");
    session.setVisitorMode(false);
    mod.setCopyInviteHandler(vi.fn());
    mod.unlockHostInviteChrome();
    mod.initStatusPanelControls();
    mod.updateStatusPanel(getZone("grove"));
    const sessionEl = document.getElementById("status-session");
    expect(sessionEl?.textContent ?? "").toBe("");
    expect(sessionEl?.textContent ?? "").not.toMatch(/invite|share your world/i);
  });

  it("names visitor verbs on the default session line", async () => {
    document.body.innerHTML = `
      <button id="copy-invite-btn" type="button">Copy invite link</button>
      <div id="status-session"></div>
    `;
    const session = await import("../world/worldSession");
    const { getZone } = await import("../world/zones");
    const mod = await import("./statusPanel");
    session.setVisitorMode(true);
    mod.initStatusPanelControls();
    mod.updateStatusPanel(getZone("grove"));
    const sessionEl = document.getElementById("status-session");
    expect(sessionEl?.textContent ?? "").toBe("Visitor mode — walk and talk");
    expect(sessionEl?.textContent ?? "").not.toMatch(/explore only/i);
  });
});
