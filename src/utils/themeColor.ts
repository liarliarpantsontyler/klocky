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
    case "display":
      return "#000000";
    case "welcome":
      return "#ffffff";
    case "lab":
      return "#ffffff";
    default:
      return "#ffffff";
  }
}

export function syncDocumentChrome(
  view: "welcome" | "gallery" | "display" | "lab",
) {
  const color = themeColorForView(view);
  setThemeColor(color);
  if (view === "welcome") {
    document.documentElement.style.backgroundColor = color;
  } else if (view === "display") {
    document.documentElement.style.backgroundColor = color;
  } else {
    document.documentElement.style.backgroundColor = "";
  }
}
