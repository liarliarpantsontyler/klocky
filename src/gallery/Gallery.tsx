import { useState } from "react";
import { ArrowUpRight, Heart, Settings2, Sun } from "lucide-react";
import { presets } from "./presets";
import { clockById } from "../clock/definitions";
import {
  backgrounds,
  backgroundById,
  backgroundStyle,
} from "../backgrounds/definitions";
import { entitlements } from "../state/entitlements";
import { Clock } from "../clock/Clock";
import { BrandLogo } from "../components/BrandLogo";
import { IconButton } from "../components/Controls";
import type { KlockyPreset, UserPreferences } from "../types";
export function Gallery({
  preferences,
  onSelect,
  onSettings,
  favorites,
  onFavorite,
  recent,
}: {
  preferences: UserPreferences;
  onSelect: (p: KlockyPreset, element: HTMLElement) => void;
  onSettings: () => void;
  favorites: string[];
  onFavorite: (id: string) => void;
  recent: string[];
}) {
  const [filter, setFilter] = useState("All clocks");
  const [collection, setCollection] = useState("Collection");
  const items = presets.filter(
    (p) =>
      (collection === "Collection" || favorites.includes(p.id)) &&
      (filter === "All clocks" ||
        (filter === "Recent"
          ? recent.includes(p.id)
          : clockById(p.clockId).category === filter)),
  );
  return (
    <div className="gallery-shell">
      <header className="app-header">
        <a className="wordmark" href="/" aria-label="Klocky home">
          <BrandLogo />
        </a>
        <nav aria-label="Collection">
          <button
            className={collection === "Collection" ? "active" : ""}
            onClick={() => setCollection("Collection")}
          >
            Collection
          </button>
          <button
            className={collection === "Favorites" ? "active" : ""}
            onClick={() => setCollection("Favorites")}
          >
            Favorites <span>{favorites.length || ""}</span>
          </button>
        </nav>
        <div className="header-end">
          <span className="local-indicator">
            <span /> Live, in your time
          </span>
          <IconButton label="Open settings" onClick={onSettings}>
            <Settings2 size={19} />
          </IconButton>
        </div>
      </header>
      <main className="gallery-main">
        <div className="collection-intro">
          <div>
            <span className="eyebrow">A CLOCK. A CANVAS. A MOMENT.</span>
            <h1>Time, well spent.</h1>
            <p>A little atmosphere for the space you’re in.</p>
          </div>
          <div className="collection-note">
            <Sun size={25} strokeWidth={1} />
            <span>
              Find your rhythm.
              <br />
              Let the rest slow down.
            </span>
          </div>
        </div>
        <div className="collection-toolbar">
          <div className="filters" aria-label="Filter clocks">
            {["All clocks", "Digital", "Analog", "Typographic", "Recent"].map(
              (f) => (
                <button
                  key={f}
                  className={filter === f ? "selected" : ""}
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                >
                  {f}
                  {f === "All clocks" && (
                    <span>{presets.length.toString().padStart(2, "0")}</span>
                  )}
                </button>
              ),
            )}
          </div>
          <span className="collection-count">
            {items.length.toString().padStart(2, "0")} compositions{" "}
            <span className="tiny-grid">▦</span>
          </span>
        </div>
        <div className="clock-gallery">
          {items.map((p, i) => {
            const shown = {
              ...p,
              clockOptions: {
                ...p.clockOptions,
                hour24: preferences.hour24,
                showSeconds: preferences.seconds,
              },
            };
            return (
              <article
                className="gallery-item"
                key={p.id}
                style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
              >
                <button
                  className="clock-card"
                  disabled={!entitlements.canUse(clockById(p.clockId))}
                  data-testid={"preset-" + p.id}
                  aria-label={`Display ${p.name}`}
                  onClick={(e) => onSelect(shown, e.currentTarget)}
                >
                  <div
                    className="card-art"
                    style={backgroundStyle(p.backgroundId)}
                  >
                    <Clock preset={shown} preferences={preferences} thumbnail />
                    <span className="card-enter">
                      <ArrowUpRight size={20} />
                    </span>
                  </div>
                </button>
                <div className="card-caption">
                  <div>
                    <h2>{p.name}</h2>
                    <span>
                      {backgroundById(p.backgroundId).name}{" "}
                      <span className="caption-dot">·</span>{" "}
                      {clockById(p.clockId).category}
                    </span>
                  </div>
                  <IconButton
                    label={`${favorites.includes(p.id) ? "Unfavorite" : "Favorite"} ${p.name}`}
                    onClick={() => onFavorite(p.id)}
                    aria-pressed={favorites.includes(p.id)}
                  >
                    <Heart
                      size={15}
                      fill={favorites.includes(p.id) ? "currentColor" : "none"}
                    />
                  </IconButton>
                </div>
              </article>
            );
          })}
        </div>
        {!items.length && (
          <div className="empty-state">
            <Heart size={25} />
            <h2>
              {collection === "Favorites"
                ? "Keep a little collection."
                : "Nothing here just yet."}
            </h2>
            <p>
              {collection === "Favorites"
                ? "Tap the heart beside a clock to save it here."
                : "Open a clock, then find it in Recent."}
            </p>
          </div>
        )}
        <footer className="gallery-footer">
          <span>Yours to make time for.</span>
          <span>
            {presets.length} clocks <i> / </i> {backgrounds.length} atmospheres{" "}
            <i> / </i> Endless moments
          </span>
          <span>
            Klocky <span className="footer-mark">↗</span>
          </span>
        </footer>
      </main>
    </div>
  );
}
