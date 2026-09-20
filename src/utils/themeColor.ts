import type { CSSProperties } from "react";
import {
  backgroundById,
  backgroundStyleForPreset,
} from "../backgrounds/definitions";
import type { KlockyPreset } from "../types";

const META = 'meta[name="theme-color"]';

export function setThemeColor(color: string) {
  let meta = document.querySelector<HTMLMetaElement>(META);
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = color;
}

export function themeColorForView(
  view: "welcome" | "gallery" | "display" | "lab",
): string {
  switch (view) {
    case "welcome":
      return "#ffffff";
    case "lab":
      return "#ffffff";
    default:
      return "#ffffff";
  }
}

function themeColorForPreset(preset: KlockyPreset): string {
  const def = backgroundById(preset.backgroundId);
  if (def.staticBackground) return "#ffffff";
  const palette =
    preset.backgroundOptions?.palette ?? def.defaultUniforms.palette;
  return palette[0];
}

function applyBackgroundLayers(el: HTMLElement, style: CSSProperties) {
  if ("background" in style && style.background) {
    el.style.background = String(style.background);
  } else {
    el.style.background = "";
    el.style.backgroundColor = String(style.backgroundColor ?? "");
    el.style.backgroundImage = String(style.backgroundImage ?? "");
  }
  el.style.backgroundSize = "cover";
  el.style.backgroundPosition = "center";
  el.style.backgroundAttachment = "fixed";
  el.style.backgroundRepeat = "no-repeat";
}

function clearBackgroundLayers(el: HTMLElement) {
  el.style.background = "";
  el.style.backgroundColor = "";
  el.style.backgroundImage = "";
  el.style.backgroundSize = "";
  el.style.backgroundPosition = "";
  el.style.backgroundAttachment = "";
  el.style.backgroundRepeat = "";
}

function syncRootBackground(style: CSSProperties | null) {
  for (const el of [document.documentElement, document.body]) {
    if (style) applyBackgroundLayers(el, style);
    else clearBackgroundLayers(el);
  }
}

export function syncDocumentChrome(
  view: "welcome" | "gallery" | "display" | "lab",
  preset?: KlockyPreset,
) {
  if (view === "display" && preset) {
    const style = backgroundStyleForPreset(preset);
    setThemeColor(themeColorForPreset(preset));
    syncRootBackground(style);
    document.documentElement.dataset.displayBackground = preset.backgroundId;
    return;
  }

  delete document.documentElement.dataset.displayBackground;
  syncRootBackground(null);
  const color = themeColorForView(view);
  setThemeColor(color);
  if (view === "welcome") {
    document.documentElement.style.backgroundColor = color;
  }
}
