import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Plus,
  Minus,
  Shuffle,
  ImagePlus,
  Download,
  Camera,
  Copy,
  Check,
} from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";
import type { BackgroundOptions, UserPreferences } from "../types";
import {
  backgrounds,
  backgroundById,
  uniformControls,
} from "../backgrounds/definitions";
import { Background } from "../backgrounds/Background";
import { Clock } from "../clock/Clock";
import { presets } from "../gallery/presets";
import { Toggle, IconButton } from "../components/Controls";
import { extractPalette } from "../utils/palette";
import { download, exportBackground } from "../state/storage";
import "./lab.css";
import { motionProfiles } from "../shaders/motion";
export default function Lab({
  preferences,
  reduced,
  notify,
}: {
  preferences: UserPreferences;
  reduced: boolean;
  notify: (s: string) => void;
}) {
  const [backgroundId, setBackgroundId] = useState("chroma"),
    [options, setOptions] = useState<BackgroundOptions>(() =>
      structuredClone(backgrounds[0].defaultUniforms),
    );
  const [name, setName] = useState("Untitled atmosphere"),
    [showClock, setShowClock] = useState(false),
    [paused, setPaused] = useState(false),
    [json, setJson] = useState(""),
    [image, setImage] = useState(""),
    [processing, setProcessing] = useState(false),
    [copied, setCopied] = useState(false);
  const [photoGlass, setPhotoGlass] = useState(false);
  const capture = useRef<(() => string) | null>(null);
  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image);
    },
    [image],
  );
  const def = backgroundById(backgroundId);
  const set = (key: keyof BackgroundOptions, value: number) =>
    setOptions((o) => ({ ...o, [key]: value }));
  const updateColor = (idx: number, value: string) =>
    setOptions((o) => ({
      ...o,
      palette: o.palette.map((c, i) => (i === idx ? value : c)),
    }));
  function move(idx: number, d: number) {
    setOptions((o) => {
      const p = [...o.palette];
      [p[idx], p[idx + d]] = [p[idx + d], p[idx]];
      return { ...o, palette: p };
    });
  }
  async function photo(file?: File) {
    if (!file) return;
    setProcessing(true);
    try {
      const colors = await extractPalette(file);
      setOptions((o) => ({ ...o, palette: colors }));
      if (image) URL.revokeObjectURL(image);
      setImage(URL.createObjectURL(file));
      notify("Six colors, found in your photograph.");
    } catch (e) {
      notify(
        e instanceof Error ? e.message : "Could not read this photograph.",
      );
    } finally {
      setProcessing(false);
    }
  }
  function save() {
    const id =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "untitled-atmosphere";
    const result = exportBackground(id, name, def.algorithm, options);
    const text = JSON.stringify(result, null, 2);
    setJson(text);
    try {
      const saved = JSON.parse(localStorage.getItem("klocky.lab") || "[]");
      localStorage.setItem(
        "klocky.lab",
        JSON.stringify(
          [result, ...saved.filter((p: { id: string }) => p.id !== id)].slice(
            0,
            30,
          ),
        ),
      );
    } catch {
      /* JSON download remains available */
    }
    download(id + ".json", text);
    notify("Preset saved on this device and exported as JSON.");
  }
  function poster() {
    const data = capture.current?.();
    if (!data) {
      notify("Poster capture needs WebGL2. Try a supported browser.");
      return;
    }
    const a = document.createElement("a");
    a.href = data;
    a.download =
      (name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "klocky") + ".webp";
    a.click();
    notify("Poster frame captured.");
  }
  return (
    <div className="lab">
      <header className="lab-header">
        <a href="/" className="lab-back">
          <ArrowLeft size={16} />
          <BrandLogo />
          <b>Lab</b>
        </a>
        <span className="eyebrow">EXPERIMENTS IN ATMOSPHERE</span>
        <button className="lab-save" onClick={save}>
          <Download size={15} /> Save as preset
        </button>
      </header>
      <main className="lab-workspace">
        <section className="lab-canvas-area">
          <div className="lab-art">
            <Background
              id={backgroundId}
              options={options}
              reduced={reduced || paused}
              captureRef={capture}
              photoSource={
                photoGlass && backgroundId === "weave" ? image : undefined
              }
            />
            {showClock && (
              <Clock
                preset={{
                  ...presets[0],
                  backgroundId,
                  clockOptions: {
                    ...presets[0].clockOptions,
                    color: def.suggestedClockColors[0],
                  },
                }}
                preferences={preferences}
              />
            )}
            <div className="lab-art-tag">
              <span />
              {paused || reduced ? "STILL FRAME" : "LIVE CANVAS"}
            </div>
          </div>
          <div className="lab-canvas-footer">
            <div>
              <span className="eyebrow">
                {def.family.toUpperCase()} / {def.name.toUpperCase()}
              </span>
              <h1>Make room for a new mood.</h1>
            </div>
            <button className="capture-button" onClick={poster}>
              <Camera size={17} /> Capture poster frame
            </button>
          </div>
          <div className="lab-preview-options">
            <Toggle
              label="Preview with clock"
              checked={showClock}
              onChange={setShowClock}
            />
            <Toggle
              label="Pause motion"
              checked={paused}
              onChange={setPaused}
            />
          </div>
          {image && (
            <div className="photo-palette">
              <img src={image} alt="Your local source photograph" />
              <div>
                <span className="eyebrow">COLORS, FOUND</span>
                <p>A little of your world, distilled.</p>
                <span className="help-text">
                  Processed on this device. Never uploaded.
                </span>
                <Toggle
                  label="Photograph through glass"
                  checked={photoGlass && backgroundId === "weave"}
                  onChange={(value) => {
                    setPhotoGlass(value);
                    if (value) {
                      setBackgroundId("weave");
                      setOptions((o) => ({
                        ...backgroundById("weave").defaultUniforms,
                        palette: o.palette,
                      }));
                    }
                  }}
                />
                {photoGlass && backgroundId === "weave" && (
                  <p className="help-text">
                    Capture a poster to keep the photograph and glass together.
                    Preset JSON saves the pattern and palette; your photo stays
                    in this session.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
        <aside
          className="lab-inspector"
          aria-label="Background design controls"
        >
          <div className="lab-inspector-inner">
            <label className="lab-name">
              Preset name
              <input
                aria-label="Preset name"
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="select-row">
              Starting point
              <select
                aria-label="Shader family"
                value={backgroundId}
                onChange={(e) => {
                  const b = backgroundById(e.target.value);
                  setBackgroundId(b.id);
                  setOptions(structuredClone(b.defaultUniforms));
                }}
              >
                {backgrounds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} · {b.family}
                  </option>
                ))}
              </select>
            </label>
            <div className="lab-divider" />
            <div className="palette-heading">
              <span>
                Palette <small>{options.palette.length}/8</small>
              </span>
              <div>
                <label
                  className="upload-button"
                  title="Extract palette from photograph"
                >
                  <ImagePlus size={16} />
                  <input
                    type="file"
                    accept="image/*"
                    aria-label="Upload photograph"
                    onChange={(e) => void photo(e.target.files?.[0])}
                    disabled={processing}
                  />
                </label>
                <IconButton
                  label="Randomize palette"
                  onClick={() => {
                    const curated =
                      backgrounds[
                        Math.floor(Math.random() * backgrounds.length)
                      ].defaultUniforms.palette;
                    setOptions((o) => ({ ...o, palette: [...curated] }));
                  }}
                >
                  <Shuffle size={15} />
                </IconButton>
                <IconButton
                  label="Add color"
                  onClick={() => {
                    if (options.palette.length < 8)
                      setOptions((o) => ({
                        ...o,
                        palette: [...o.palette, "#c3c9ab"],
                      }));
                    else notify("A palette can contain up to eight colors.");
                  }}
                >
                  <Plus size={16} />
                </IconButton>
              </div>
            </div>
            {processing && (
              <p className="help-text" role="status">
                Finding the colors in your image…
              </p>
            )}
            <div className="palette-list">
              {options.palette.map((color, i) => (
                <div className="palette-color" key={i}>
                  <label
                    className="palette-color-input"
                    style={{ background: color }}
                  >
                    <input
                      aria-label={`Palette color ${i + 1}`}
                      type="color"
                      value={color}
                      onChange={(e) => updateColor(i, e.target.value)}
                    />
                  </label>
                  <span>{color.toUpperCase()}</span>
                  <button
                    aria-label={`Move color ${i + 1} up`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    aria-label={`Move color ${i + 1} down`}
                    disabled={i === options.palette.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    aria-label={`Delete color ${i + 1}`}
                    disabled={options.palette.length <= 2}
                    onClick={() =>
                      setOptions((o) => ({
                        ...o,
                        palette: o.palette.filter((_, j) => j !== i),
                      }))
                    }
                  >
                    <Minus size={13} />
                  </button>
                </div>
              ))}
            </div>
            <label className="select-row">
              Interpolation
              <select
                aria-label="Gradient interpolation"
                value={options.interpolation}
                onChange={(e) => set("interpolation", Number(e.target.value))}
              >
                <option value="0">Linear</option>
                <option value="1">Smooth</option>
                <option value="2">Stepped</option>
              </select>
            </label>
            <div className="lab-divider" />
            {uniformControls.map((c) => (
              <label className="range-row" key={c.key}>
                {c.label}
                <output>
                  {Number(options[c.key]).toFixed(c.step < 1 ? 2 : 0)}
                </output>
                <input
                  aria-label={c.label}
                  title={
                    c.key === "motion"
                      ? motionProfiles[def.algorithm]?.description
                      : undefined
                  }
                  aria-description={
                    c.key === "motion"
                      ? motionProfiles[def.algorithm]?.description
                      : undefined
                  }
                  type="range"
                  min={c.min}
                  max={c.max}
                  step={c.step}
                  value={options[c.key] as number}
                  onChange={(e) => set(c.key, Number(e.target.value))}
                />
              </label>
            ))}
            <p className="help-text">
              Controls respond to the selected shader. Softness affects
              edge-based fields; palette interpolation affects multicolor
              fields.
            </p>
            <button
              className="lab-reset"
              onClick={() => setOptions(structuredClone(def.defaultUniforms))}
            >
              Reset to starting point
            </button>
          </div>
        </aside>
      </main>
      {json && (
        <section className="lab-export">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">READY FOR THE COLLECTION</span>
              <h2>Your new atmosphere.</h2>
            </div>
            <button
              className="capture-button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(json);
                  setCopied(true);
                } catch {
                  notify("Select the JSON below to copy it.");
                }
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
              {copied ? "Copied" : "Copy JSON"}
            </button>
          </div>
          <textarea
            aria-label="Exported background JSON"
            readOnly
            value={json}
          />
          <p className="help-text">
            Add this definition to the background collection, then put its
            captured poster in public/posters. The algorithm key uses Klocky’s
            shared shader library.
          </p>
        </section>
      )}
    </div>
  );
}
