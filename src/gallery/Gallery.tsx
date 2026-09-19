import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Heart as PikaHeart, Settings01 } from "pikaicons";
import { PikaIcon } from "../components/PikaIcon";
import { presets } from "./presets";
import { clockById } from "../clock/definitions";
import { backgroundById, backgroundStyle } from "../backgrounds/definitions";
import { entitlements } from "../state/entitlements";
import { presetsMatchConfiguration } from "../state/storage";
import { Clock } from "../clock/Clock";
import { BrandLogo } from "../components/BrandLogo";
import { IconButton } from "../components/Controls";
import type { KlockyPreset, UserPreferences } from "../types";
import { uiPx } from "../utils/uiScale";
export function Gallery({
  preferences,
  onSelect,
  onSettings,
  favorites,
  savedFavorites,
  onFavorite,
  onToggleSavedFavorite,
  recent,
}: {
  preferences: UserPreferences;
  onSelect: (p: KlockyPreset, element: HTMLElement) => void;
  onSettings: () => void;
  favorites: string[];
  savedFavorites: KlockyPreset[];
  onFavorite: (id: string) => void;
  onToggleSavedFavorite: (preset: KlockyPreset) => void;
  recent: string[];
}) {
  const [filter, setFilter] = useState("All clocks");
  const [collection, setCollection] = useState("Collection");
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const scrollReady = useRef(false);
  useEffect(() => {
    lastScrollY.current = window.scrollY;
    scrollReady.current = true;
    const onScroll = () => {
      if (!scrollReady.current) return;
      const y = window.scrollY;
      const delta = y - lastScrollY.current;
      if (y <= 16) {
        setHeaderHidden(false);
      } else if (delta > 10) {
        setHeaderHidden(true);
      } else if (delta < -6) {
        setHeaderHidden(false);
      }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const curatedIds = new Set(presets.map((p) => p.id));
  const favoriteItems = [
    ...presets.filter((p) => favorites.includes(p.id)),
    ...savedFavorites.filter(
      (saved) =>
        !presets.some(
          (curated) =>
            favorites.includes(curated.id) &&
            presetsMatchConfiguration(curated, saved),
        ),
    ),
  ];
  const matchesFilter = (p: KlockyPreset) =>
    filter === "All clocks" ||
    (filter === "Recent"
      ? recent.includes(p.id) ||
        savedFavorites.some((saved) => presetsMatchConfiguration(saved, p))
      : clockById(p.clockId).category === filter);
  const items = (collection === "Collection" ? presets : favoriteItems).filter(
    matchesFilter,
  );
  function isFavorited(p: KlockyPreset) {
    if (curatedIds.has(p.id) && favorites.includes(p.id)) return true;
    return savedFavorites.some((saved) => presetsMatchConfiguration(saved, p));
  }
  function toggleFavorite(p: KlockyPreset) {
    if (curatedIds.has(p.id)) onFavorite(p.id);
    else onToggleSavedFavorite(p);
  }
  return (
    <div className="gallery-shell">
      <header
        className={
          "app-header gallery-header" +
          (headerHidden ? " gallery-header--hidden" : "")
        }
      >
        <button
          type="button"
          className={
            "wordmark" + (collection === "Collection" ? " wordmark--active" : "")
          }
          aria-label="Klocky collection"
          aria-current={collection === "Collection" ? "page" : undefined}
          onClick={() => {
            setCollection("Collection");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <BrandLogo header />
        </button>
        <div className="header-end">
          <span className="local-indicator">
            <span /> Live, in your time
          </span>
          <div className="gallery-header-actions">
            <IconButton
              label={
                favorites.length + savedFavorites.length > 0
                  ? `My favorites, ${favorites.length + savedFavorites.length} saved`
                  : "My favorites"
              }
              className={
                collection === "Favorites"
                  ? "gallery-header-icon--active"
                  : ""
              }
              aria-pressed={collection === "Favorites"}
              onClick={() => setCollection("Favorites")}
            >
              <PikaIcon icon={PikaHeart} size={uiPx(20)} />
            </IconButton>
            <IconButton label="Open settings" onClick={onSettings}>
              <PikaIcon icon={Settings01} size={uiPx(20)} />
            </IconButton>
          </div>
        </div>
      </header>
      <main className="gallery-main">
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
                      <ArrowUpRight size={uiPx(20)} />
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
                    label={`${isFavorited(p) ? "Unfavorite" : "Favorite"} ${p.name}`}
                    onClick={() => toggleFavorite(p)}
                    aria-pressed={isFavorited(p)}
                  >
                    <PikaIcon icon={PikaHeart} size={uiPx(20)} />
                  </IconButton>
                </div>
              </article>
            );
          })}
        </div>
        {!items.length && (
          <div className="empty-state">
            <PikaIcon icon={PikaHeart} size={uiPx(28)} className="empty-state-heart" />
            <h2>
              {collection === "Favorites"
                ? "Keep a little collection."
                : "Nothing here just yet."}
            </h2>
            <p>
              {collection === "Favorites"
                ? "Tap the heart on a clock, or save your exact setup from the display."
                : "Open a clock, then find it in Recent."}
            </p>
          </div>
        )}
        <footer className="gallery-footer">
          <a
            className="gallery-footer-brand"
            href="https://www.humin.work"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="humin — opens humin.work in a new tab"
          >
            <span className="gallery-footer-copy">
              humin © {new Date().getFullYear()}
            </span>
            <img
              className="gallery-footer-humin-logo"
              src="/brand/humin-mascot.svg"
              alt=""
              aria-hidden="true"
              draggable={false}
            />
          </a>
        </footer>
      </main>
    </div>
  );
}
