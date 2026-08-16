import { getMaterialIconSrc, getMaterialName } from "../inventory/materials";

export function appendMaterialVisual(
  el: HTMLElement,
  materialId: string,
  options: { showName: boolean },
): void {
  const name = getMaterialName(materialId);
  el.title = name;
  el.setAttribute("aria-label", name);

  const src = getMaterialIconSrc(materialId);
  if (src) {
    const img = document.createElement("img");
    img.className = "material-icon";
    img.src = src;
    img.alt = "";
    img.draggable = false;
    img.setAttribute("aria-hidden", "true");
    img.addEventListener("error", () => {
      img.remove();
      if (!options.showName && !el.querySelector(".material-icon-fallback")) {
        const fallback = document.createElement("span");
        fallback.className = "material-icon-fallback";
        fallback.textContent = name;
        el.appendChild(fallback);
      }
    });
    el.appendChild(img);
  }

  if (options.showName || !src) {
    const label = document.createElement("span");
    label.className = "material-icon-name";
    label.textContent = name;
    el.appendChild(label);
  }
}
