import {
  ArrowLeft,
  ChevronDown,
  Minus,
  Plus,
  RotateCcw,
  Shuffle,
} from "lucide-react";
import type { CSSProperties } from "react";
import type {
  BackgroundDefinition,
  BackgroundOptions,
  ShaderUniformDefinition,
} from "../types";

const coreKeys = new Set<keyof BackgroundOptions>([
  "motion",
  "scale",
  "intensity",
  "grain",
]);

function displayedValue(control: ShaderUniformDefinition, value: number) {
  if (control.key === "direction")
    return `${Math.round((value * 180) / Math.PI)}°`;
  if (control.key === "seed") return String(Math.round(value));
  return value.toFixed(control.step < 0.01 ? 3 : 2);
}

export function BackgroundFineTune({
  background,
  options,
  onOption,
  onBack,
  onReset,
}: {
  background: BackgroundDefinition;
  options: Partial<BackgroundOptions>;
  onOption: <K extends keyof BackgroundOptions>(
    key: K,
    value: BackgroundOptions[K],
  ) => void;
  onBack: () => void;
  onReset: () => void;
}) {
  const effective = { ...background.defaultUniforms, ...options };
  const controls = background.customizableUniforms;
  const core = controls.filter((control) => coreKeys.has(control.key));
  const advanced = controls.filter((control) => !coreKeys.has(control.key));
  const isSolid = Boolean(
    background.staticBackground &&
    !background.staticBackground.includes("url("),
  );
  const palette = isSolid ? effective.palette.slice(0, 1) : effective.palette;

  const updateColor = (index: number, color: string) =>
    onOption(
      "palette",
      isSolid
        ? effective.palette.map(() => color)
        : effective.palette.map((current, i) =>
            i === index ? color : current,
          ),
    );

  const shufflePalette = () => {
    const original = effective.palette;
    const palette = [...original];
    for (let i = palette.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [palette[i], palette[j]] = [palette[j], palette[i]];
    }
    if (palette.every((color, index) => color === original[index]))
      palette.push(palette.shift()!);
    onOption("palette", palette);
  };

  return (
    <div className="background-fine-tune">
      <div className="fine-tune-heading">
        <button className="fine-tune-back" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>
            <small>Backgrounds</small>
            Customize {background.name}
          </span>
        </button>
        <button className="fine-tune-reset" onClick={onReset}>
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      <div className="fine-tune-group">
        <div className="fine-tune-label-row">
          <span className="field-label">Colors</span>
          {!isSolid && (
            <button onClick={shufflePalette}>
              <Shuffle size={14} /> Shuffle
            </button>
          )}
        </div>
        <div className="fine-palette" aria-label="Background colors">
          {palette.map((color, index) => (
            <span className="fine-palette-item" key={`${index}-${color}`}>
              <label style={{ background: color }}>
                <input
                  type="color"
                  aria-label={`Background color ${index + 1}`}
                  value={color}
                  onChange={(event) => updateColor(index, event.target.value)}
                />
              </label>
              {!isSolid && effective.palette.length > 2 && (
                <button
                  aria-label={`Remove background color ${index + 1}`}
                  onClick={() =>
                    onOption(
                      "palette",
                      effective.palette.filter((_, i) => i !== index),
                    )
                  }
                >
                  <Minus size={10} />
                </button>
              )}
            </span>
          ))}
          {!isSolid && effective.palette.length < 8 && (
            <button
              className="fine-palette-add"
              aria-label="Add background color"
              onClick={() =>
                onOption("palette", [...effective.palette, "#c3c9ab"])
              }
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>

      {core.length > 0 && (
        <div className="fine-tune-group fine-tune-sliders">
          {core.map((control) => (
            <BackgroundSlider
              key={control.key}
              control={control}
              value={effective[control.key] as number}
              onChange={(value) => onOption(control.key, value)}
            />
          ))}
        </div>
      )}

      {advanced.length > 0 && (
        <details className="fine-tune-advanced">
          <summary>
            <span>Advanced</span>
            <span className="fine-tune-summary-end">
              <small>{advanced.length + 1} controls</small>
              <ChevronDown size={15} />
            </span>
          </summary>
          <div className="fine-tune-advanced-body">
            <div className="fine-interpolation">
              <span className="field-label">Color blending</span>
              <div role="group" aria-label="Color blending">
                {[
                  [0, "Linear"],
                  [1, "Smooth"],
                  [2, "Stepped"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    aria-pressed={effective.interpolation === value}
                    onClick={() => onOption("interpolation", Number(value))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {advanced.map((control) => (
              <BackgroundSlider
                key={control.key}
                control={control}
                value={effective[control.key] as number}
                onChange={(value) => onOption(control.key, value)}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function BackgroundSlider({
  control,
  value,
  onChange,
}: {
  control: ShaderUniformDefinition;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="fine-tune-range">
      <span>{control.label}</span>
      <output>{displayedValue(control, value)}</output>
      <input
        className="klocky-range"
        type="range"
        aria-label={`Background ${control.label.toLowerCase()}`}
        min={control.min}
        max={control.max}
        step={control.step}
        value={value}
        style={
          {
            "--range-fill": `${
              ((value - control.min) / (control.max - control.min)) * 100
            }%`,
          } as CSSProperties
        }
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
