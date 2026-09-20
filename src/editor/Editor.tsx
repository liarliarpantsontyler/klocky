import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  ImageIcon,
  Shuffle,
  Type,
} from "lucide-react";
import {
  backgroundById,
  backgrounds,
  backgroundStyle,
} from "../backgrounds/definitions";
import {
  clocks,
  clockById,
  CLOCK_SIZE_DEFAULT,
  CLOCK_SIZE_MAX,
  CLOCK_SIZE_MIN,
  fontWeightOptions,
  fonts,
  remapFontWeight,
  safeClockOptions,
} from "../clock/definitions";
import type {
  BackgroundOptions,
  ClockOptions,
  FillStyle,
  FontId,
  KlockyPreset,
  UserPreferences,
  WeatherState,
} from "../types";
import { entitlements } from "../state/entitlements";
import { motionProfiles } from "../shaders/motion";
import { ClockStylePreview } from "./ClockStylePreview";
import { BackgroundFineTune } from "./BackgroundFineTune";
import { pickDifferent, randomTypography } from "./randomize";
import { uiPx } from "../utils/uiScale";

type EditorSection = "Background" | "Layout" | "Font";

const quickBackgroundControls: Array<{
  key: "motion" | "scale" | "intensity";
  label: string;
  min: number;
  max: number;
}> = [
  { key: "motion", label: "Motion", min: 0, max: 2 },
  { key: "scale", label: "Scale", min: 0.4, max: 3 },
  { key: "intensity", label: "Intensity", min: 0, max: 2 },
];

function toCentered(value: number, center: number, min: number, max: number) {
  const amount =
    value < center
      ? ((value - center) / Math.max(center - min, 0.001)) * 100
      : ((value - center) / Math.max(max - center, 0.001)) * 100;
  return Math.round(Math.max(-100, Math.min(100, amount)));
}

function fromCentered(value: number, center: number, min: number, max: number) {
  return value < 0
    ? center + (value / 100) * (center - min)
    : center + (value / 100) * (max - center);
}

export function Editor({
  preset,
  onChange,
  preferences,
  weather,
}: {
  preset: KlockyPreset;
  onChange: (p: KlockyPreset) => void;
  preferences: UserPreferences;
  weather: WeatherState;
}) {
  const panel = useRef<HTMLElement>(null);
  const [section, setSection] = useState<EditorSection | "">("Background");
  const [backgroundDetail, setBackgroundDetail] = useState(false);
  const [backgroundPickerExpanded, setBackgroundPickerExpanded] = useState(true);
  const [backgroundPicked, setBackgroundPicked] = useState(false);
  const [typefaceOpen, setTypefaceOpen] = useState(false);
  const typefacePicker = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prior = document.activeElement as HTMLElement;
    panel.current?.focus();
    return () => {
      if (prior?.isConnected) prior.focus();
    };
  }, []);

  useEffect(() => {
    if (!typefaceOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!typefacePicker.current?.contains(event.target as Node))
        setTypefaceOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTypefaceOpen(false);
    };
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", escape);
    };
  }, [typefaceOpen]);

  const clock = clockById(preset.clockId);
  const background = backgroundById(preset.backgroundId);
  const o = preset.clockOptions;
  const option = (p: Partial<ClockOptions>) =>
    onChange({ ...preset, clockOptions: { ...o, ...p } });
  const backgroundOption = <K extends keyof BackgroundOptions>(
    key: K,
    value: BackgroundOptions[K],
  ) =>
    onChange({
      ...preset,
      backgroundOptions: { ...preset.backgroundOptions, [key]: value },
    });
  const sections: Array<{
    name: EditorSection;
    summary: string;
    icon: typeof ImageIcon;
  }> = [
    { name: "Background", summary: background.name, icon: ImageIcon },
    { name: "Layout", summary: clock.name, icon: Clock3 },
    { name: "Font", summary: fonts[o.font].name, icon: Type },
  ];

  function randomize(name: EditorSection) {
    if (name === "Background") {
      const available = backgrounds.filter((item) => entitlements.canUse(item));
      const id = pickDifferent(
        available.map((item) => item.id),
        preset.backgroundId,
      );
      const next = backgroundById(id);
      setBackgroundDetail(false);
      setBackgroundPickerExpanded(false);
      setBackgroundPicked(true);
      onChange({
        ...preset,
        backgroundId: id,
        backgroundOptions: {},
        clockOptions: {
          ...o,
          color: next.suggestedClockColors[0],
        },
      });
      return;
    }

    if (name === "Layout") {
      const available = clocks.filter((item) => entitlements.canUse(item));
      const id = pickDifferent(
        available.map((item) => item.id),
        preset.clockId,
      );
      onChange({
        ...preset,
        clockId: id,
        clockOptions: safeClockOptions(id, o),
      });
      return;
    }

    option(randomTypography(clock.allowedFonts, o.font, o.weight));
  }

  function randomizeAll() {
    const availableBackgrounds = backgrounds.filter((item) =>
      entitlements.canUse(item),
    );
    const backgroundId = pickDifferent(
      availableBackgrounds.map((item) => item.id),
      preset.backgroundId,
    );
    const nextBackground = backgroundById(backgroundId);
    setBackgroundDetail(false);
    setBackgroundPickerExpanded(false);
    setBackgroundPicked(true);

    const availableClocks = clocks.filter((item) => entitlements.canUse(item));
    const clockId = pickDifferent(
      availableClocks.map((item) => item.id),
      preset.clockId,
    );
    const nextClock = clockById(clockId);
    const compatibleOptions = safeClockOptions(clockId, {
      ...o,
      color: nextBackground.suggestedClockColors[0],
    });
    const typography = randomTypography(
      nextClock.allowedFonts,
      compatibleOptions.font,
      compatibleOptions.weight,
    );

    onChange({
      ...preset,
      backgroundId,
      backgroundOptions: {},
      clockId,
      clockOptions: safeClockOptions(clockId, {
        ...compatibleOptions,
        ...typography,
      }),
    });
  }

  function selectBackground(id: string) {
    const b = backgroundById(id);
    const changed = id !== preset.backgroundId;
    onChange({
      ...preset,
      backgroundId: id,
      backgroundOptions: changed ? {} : preset.backgroundOptions,
      clockOptions: changed
        ? { ...o, color: b.suggestedClockColors[0] }
        : o,
    });
    setBackgroundPicked(true);
    setBackgroundPickerExpanded(false);
    setBackgroundDetail(false);
  }

  const showBackgroundTuning =
    backgroundPicked && !backgroundPickerExpanded && !backgroundDetail;

  return (
    <aside
      ref={panel}
      tabIndex={-1}
      className="editor glass-panel"
      aria-label="Customize clock"
    >
      <div className="editor-scroll">
        {sections.map(({ name, summary, icon: SectionIcon }) => {
          const isOpen = section === name;
          const contentId = `editor-${name.toLowerCase()}-content`;
          return (
            <section className="editor-section" key={name}>
              <div className="section-heading-row">
                <button
                  className="section-toggle"
                  aria-expanded={isOpen}
                  aria-controls={contentId}
                  onClick={() => {
                    setSection(isOpen ? "" : name);
                    if (name === "Background") {
                      setBackgroundDetail(false);
                      if (!isOpen) {
                        setBackgroundPickerExpanded(!backgroundPicked);
                      }
                    }
                  }}
                >
                  <span className="section-title">
                    <SectionIcon size={uiPx(21)} strokeWidth={1.65} />
                    {name}
                  </span>
                  <span className="section-selection">
                    <span>{summary}</span>
                    <ChevronDown
                      size={uiPx(19)}
                      className={isOpen ? "rotated" : ""}
                    />
                  </span>
                </button>
                <button
                  className="section-randomize"
                  aria-label={`Randomize ${name.toLowerCase()}`}
                  title={`Randomize ${name.toLowerCase()}`}
                  disabled={name === "Font" && clock.allowedFonts.length < 2}
                  onClick={() => randomize(name)}
                >
                  <Shuffle size={uiPx(16)} />
                </button>
              </div>

              {isOpen && (
                <div className="section-content" id={contentId}>
                  {name === "Background" &&
                    (backgroundDetail ? (
                      <BackgroundFineTune
                        background={background}
                        options={preset.backgroundOptions}
                        onOption={backgroundOption}
                        onBack={() => setBackgroundDetail(false)}
                        onReset={() =>
                          onChange({ ...preset, backgroundOptions: {} })
                        }
                      />
                    ) : (
                      <>
                        {backgroundPickerExpanded ? (
                          <div className="background-picker-wrap">
                            <div className="background-picker">
                              {backgrounds.map((b) => (
                                <button
                                  key={b.id}
                                  disabled={!entitlements.canUse(b)}
                                  className={
                                    "background-choice " +
                                    (preset.backgroundId === b.id
                                      ? "selected"
                                      : "")
                                  }
                                  aria-label={`Background ${b.name}`}
                                  aria-pressed={preset.backgroundId === b.id}
                                  onClick={() => selectBackground(b.id)}
                                >
                                  <span
                                    className="background-swatch"
                                    style={backgroundStyle(b.id)}
                                  >
                                    {preset.backgroundId === b.id && (
                                      <Check size={uiPx(16)} />
                                    )}
                                  </span>
                                  <span>{b.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="background-picker-summary"
                            aria-expanded={false}
                            onClick={() => {
                              setBackgroundPickerExpanded(true);
                              setBackgroundDetail(false);
                            }}
                          >
                            <span
                              className="background-swatch"
                              style={backgroundStyle(preset.backgroundId)}
                            >
                              <Check size={uiPx(16)} />
                            </span>
                            <span className="background-picker-summary-copy">
                              <strong>{background.name}</strong>
                              <small>Change background</small>
                            </span>
                            <ChevronDown size={uiPx(17)} />
                          </button>
                        )}
                        {showBackgroundTuning && !background.staticBackground && (
                          <div
                            className="quick-background-controls"
                            role="group"
                            aria-label="Quick background controls"
                          >
                            {quickBackgroundControls.map((control) => {
                              const center =
                                background.defaultUniforms[control.key];
                              const current =
                                preset.backgroundOptions[control.key] ?? center;
                              const value = toCentered(
                                current,
                                center,
                                control.min,
                                control.max,
                              );
                              return (
                                <label
                                  className="quick-background-slider"
                                  key={control.key}
                                >
                                  <span className="quick-slider-track">
                                    <input
                                      className="klocky-range"
                                      type="range"
                                      min="-100"
                                      max="100"
                                      step="1"
                                      value={value}
                                      style={
                                        {
                                          "--range-fill": `${(value + 100) / 2}%`,
                                        } as CSSProperties
                                      }
                                      title={
                                        control.key === "motion"
                                          ? motionProfiles[background.algorithm]
                                              ?.description
                                          : undefined
                                      }
                                      aria-description={
                                        control.key === "motion"
                                          ? motionProfiles[background.algorithm]
                                              ?.description
                                          : undefined
                                      }
                                      aria-label={
                                        control.key === "motion"
                                          ? "Background motion speed"
                                          : control.key === "scale"
                                            ? "Background scale"
                                            : "Background effect intensity"
                                      }
                                      onChange={(event) =>
                                        backgroundOption(
                                          control.key,
                                          fromCentered(
                                            Number(event.target.value),
                                            center,
                                            control.min,
                                            control.max,
                                          ),
                                        )
                                      }
                                    />
                                  </span>
                                  <span>{control.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                        {showBackgroundTuning &&
                          (background.customizableUniforms.length > 0 ||
                            (background.staticBackground &&
                              !background.staticBackground.includes(
                                "url(",
                              ))) && (
                            <button
                              className="fine-tune-entry"
                              onClick={() => setBackgroundDetail(true)}
                            >
                              <span>
                                <small>Selected background</small>
                                Fine-tune {background.name}
                              </span>
                              <ArrowUpRight size={uiPx(17)} />
                            </button>
                          )}
                        {showBackgroundTuning && (
                          <button
                            type="button"
                            className="editor-step-continue"
                            onClick={() => setSection("Layout")}
                          >
                            Next: Layout <ArrowUpRight size={uiPx(17)} />
                          </button>
                        )}
                      </>
                    ))}

                  {name === "Layout" && (
                    <>
                      <div className="editor-subsection">
                        <span className="field-label">Clock style</span>
                        <div className="layout-picker">
                          {clocks.map((c) => (
                            <button
                              aria-label={c.name}
                              aria-pressed={c.id === preset.clockId}
                              className={
                                c.id === preset.clockId ? "selected" : ""
                              }
                              key={c.id}
                              disabled={!entitlements.canUse(c)}
                              onClick={() =>
                                onChange({
                                  ...preset,
                                  clockId: c.id,
                                  clockOptions: safeClockOptions(c.id, o),
                                })
                              }
                            >
                              <ClockStylePreview
                                preset={{
                                  ...preset,
                                  clockId: c.id,
                                  clockOptions: safeClockOptions(c.id, o),
                                }}
                                preferences={preferences}
                                weather={weather}
                              />
                              <span className="layout-name">{c.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="editor-subsection">
                        <span className="field-label">Clock color</span>
                        <div className="color-options">
                          {clock.allowedColors.map((color) => (
                            <button
                              aria-label={`Clock color ${color}`}
                              aria-pressed={o.color === color}
                              key={color}
                              style={{ background: color }}
                              onClick={() => option({ color })}
                            >
                              {o.color === color && (
                                <Check
                                  size={uiPx(17)}
                                  color={
                                    color === "#272923" ? "white" : "#272923"
                                  }
                                />
                              )}
                            </button>
                          ))}
                          <label
                            className="custom-color"
                            title="Custom clock color"
                          >
                            <input
                              type="color"
                              aria-label="Custom clock color"
                              value={o.color}
                              onChange={(e) =>
                                option({ color: e.target.value })
                              }
                            />
                          </label>
                        </div>
                        <div className="fill-control">
                          <span className="field-label">Fill</span>
                          <div
                            className="fill-options"
                            role="group"
                            aria-label="Fill style"
                          >
                            {(
                              ["solid", "translucent", "outline"] as FillStyle[]
                            ).map((fill) => (
                              <button
                                type="button"
                                key={fill}
                                aria-pressed={o.fill === fill}
                                disabled={!clock.allowedFills.includes(fill)}
                                onClick={() => option({ fill })}
                              >
                                {fill[0].toUpperCase() + fill.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                        {clock.supportsGlass && (
                          <label className="select-row">
                            Glass
                            <select
                              aria-label="Glass style"
                              value={o.glass}
                              onChange={(e) =>
                                option({
                                  glass: e.target
                                    .value as ClockOptions["glass"],
                                })
                              }
                            >
                              <option value="frosted">Frosted</option>
                              <option value="clear">Clear</option>
                            </select>
                          </label>
                        )}
                        <label className="range-row">
                          Opacity{" "}
                          <output>{Math.round(o.opacity * 100)}%</output>
                          <input
                            className="klocky-range"
                            aria-label="Clock opacity"
                            type="range"
                            min="0.5"
                            max="1"
                            step="0.05"
                            value={o.opacity}
                            style={
                              {
                                "--range-fill": `${
                                  ((o.opacity - 0.5) / 0.5) * 100
                                }%`,
                              } as CSSProperties
                            }
                            onChange={(e) =>
                              option({ opacity: Number(e.target.value) })
                            }
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        className="editor-step-continue"
                        onClick={() => setSection("Font")}
                      >
                        Next: Font <ArrowUpRight size={uiPx(17)} />
                      </button>
                    </>
                  )}

                  {name === "Font" && (
                    <>
                      <div className="font-control" ref={typefacePicker}>
                        <span className="field-label">Typeface</span>
                        <button
                          className="typeface-trigger"
                          aria-haspopup="listbox"
                          aria-expanded={typefaceOpen}
                          onClick={() => setTypefaceOpen((open) => !open)}
                        >
                          <span style={{ fontFamily: fonts[o.font].css }}>
                            <strong>{fonts[o.font].name}</strong>
                            <small>12:48 Aa</small>
                          </span>
                          <ChevronDown
                            size={uiPx(17)}
                            className={typefaceOpen ? "rotated" : ""}
                          />
                        </button>
                        {typefaceOpen && (
                          <div
                            className="typeface-menu"
                            role="listbox"
                            aria-label="Clock typeface"
                          >
                            {clock.allowedFonts.map((font) => (
                              <button
                                key={font}
                                role="option"
                                aria-selected={o.font === font}
                                style={{ fontFamily: fonts[font].css }}
                                onClick={() => {
                                  option({
                                    font: font as FontId,
                                    weight: remapFontWeight(
                                      o.font,
                                      font,
                                      o.weight,
                                    ),
                                  });
                                  setTypefaceOpen(false);
                                }}
                              >
                                <span>{fonts[font].name}</span>
                                <strong>12:48 Aa</strong>
                                {o.font === font && <Check size={uiPx(15)} />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="font-weight-control">
                        <span className="field-label">Weight</span>
                        <div
                          className="font-weight-options"
                          role="group"
                          aria-label="Font weight"
                        >
                          {fontWeightOptions(o.font).map((choice) => (
                            <button
                              key={choice.tier}
                              aria-pressed={o.weight === choice.value}
                              style={{
                                fontFamily: fonts[o.font].css,
                                fontWeight: choice.value,
                              }}
                              onClick={() => option({ weight: choice.value })}
                            >
                              <strong>Aa</strong>
                              <span>{choice.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <label className="range-row font-size-control">
                        Font size{" "}
                        <output>
                          {o.fontSize === CLOCK_SIZE_DEFAULT
                            ? "Default"
                            : o.fontSize === CLOCK_SIZE_MAX
                              ? "Full viewport"
                              : `${o.fontSize}%`}
                        </output>
                        <input
                          className="klocky-range"
                          aria-label="Font size"
                          type="range"
                          min={CLOCK_SIZE_MIN}
                          max={CLOCK_SIZE_MAX}
                          step="1"
                          value={o.fontSize}
                          style={
                            {
                              "--range-fill": `${
                                ((o.fontSize - CLOCK_SIZE_MIN) /
                                  (CLOCK_SIZE_MAX - CLOCK_SIZE_MIN)) *
                                100
                              }%`,
                            } as CSSProperties
                          }
                          onChange={(event) =>
                            option({ fontSize: Number(event.target.value) })
                          }
                        />
                      </label>
                      <p className="help-text">
                        100% is the layout’s intended size. Full viewport pushes
                        the clock edge to edge.
                      </p>
                    </>
                  )}
                </div>
              )}
            </section>
          );
        })}
        <div className="editor-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={randomizeAll}
          >
            Randomize all <Shuffle size={uiPx(17)} />
          </button>
        </div>
      </div>
    </aside>
  );
}
