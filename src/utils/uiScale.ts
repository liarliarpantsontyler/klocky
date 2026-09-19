/** Keep in sync with `--ui-scale` in src/styles/global.css */
export const UI_SCALE = 1.25;

export function uiPx(n: number): number {
  return Math.round(n * UI_SCALE);
}
