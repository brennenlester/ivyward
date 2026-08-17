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
  const label = document.createElement("span");
  label.className = "material-icon-name";
  label.textContent = name;

  if (src) {
    const img = document.createElement("img");
    img.className = "material-icon";
    img.src = src;
    img.alt = "";
    img.draggable = false;
    img.setAttribute("aria-hidden", "true");
    if (!options.showName) {
      label.classList.add("visually-hidden");
    }
    img.addEventListener("error", () => {
      img.remove();
      label.classList.remove("visually-hidden");
    });
    el.appendChild(img);
  }

  el.appendChild(label);
}
