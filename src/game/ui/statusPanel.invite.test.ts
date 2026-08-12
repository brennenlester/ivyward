import { afterEach, describe, expect, it, vi } from "vitest";

describe("Copy invite link status control", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.resetModules();
  });

  it("hosts can click Copy invite link to run the registered handler", async () => {
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
    expect(btn.hidden).toBe(false);
    expect(btn.disabled).toBe(true);

    const handler = vi.fn();
    mod.setCopyInviteHandler(handler);
    expect(btn.disabled).toBe(false);
    btn.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("stays disabled before a handler is registered", async () => {
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
    mod.initStatusPanelControls();

    const btn = document.getElementById("copy-invite-btn") as HTMLButtonElement;
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
});
