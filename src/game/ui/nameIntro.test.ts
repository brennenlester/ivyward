import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initNameIntro, isNameIntroOpen } from "./nameIntro";
import {
  getPlayerName,
  resetPlayerNameForTest,
  setPlayerName,
} from "../world/playerName";
import { setVisitorMode } from "../world/worldSession";

function mountIntroDom(): void {
  document.body.innerHTML = `
    <div id="name-intro" class="name-intro" hidden>
      <form id="name-intro-form">
        <input id="name-intro-input" type="text" maxlength="16" />
        <p id="name-intro-error"></p>
        <button type="submit">Begin</button>
      </form>
    </div>
  `;
}

describe("initNameIntro", () => {
  beforeEach(() => {
    resetPlayerNameForTest();
    setVisitorMode(false);
    mountIntroDom();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    resetPlayerNameForTest();
  });

  it("shows the overlay when unnamed and hides after a valid submit", () => {
    expect(initNameIntro()).toBe(true);
    expect(isNameIntroOpen()).toBe(true);

    const form = document.getElementById("name-intro-form") as HTMLFormElement;
    const input = document.getElementById(
      "name-intro-input",
    ) as HTMLInputElement;
    input.value = "Mira";
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));

    expect(isNameIntroOpen()).toBe(false);
    expect(getPlayerName()).toBe("Mira");
  });

  it("keeps the overlay open for empty names", () => {
    initNameIntro();
    const form = document.getElementById("name-intro-form") as HTMLFormElement;
    const input = document.getElementById(
      "name-intro-input",
    ) as HTMLInputElement;
    const error = document.getElementById("name-intro-error");
    input.value = "   ";
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    expect(isNameIntroOpen()).toBe(true);
    expect(error?.textContent).toMatch(/1–16/);
  });

  it("skips the overlay when a name is already set", () => {
    setPlayerName("Kept");
    expect(initNameIntro()).toBe(false);
    expect(isNameIntroOpen()).toBe(false);
  });
});
