import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import {
  ArrowLeft,
  Maximize,
  Minimize,
  SlidersHorizontal,
  Link as LinkIcon,
  Settings2,
  X,
  Heart,
} from "lucide-react";
import { Onboarding } from "../onboarding/Onboarding";
import { devicePreferences } from "../onboarding/location";
import { Gallery } from "../gallery/Gallery";
import { Clock } from "../clock/Clock";
import { Background } from "../backgrounds/Background";
import { Editor } from "../editor/Editor";
import { Settings } from "../components/Settings";
import { AccountSyncSheet } from "../components/AccountSyncSheet";
import {
  shouldPromptAfterFavoriteAdd,
  shouldPromptAfterShareWithFavorite,
} from "../account/syncPrompt";
import { useAccountSync } from "../hooks/useAccountSync";
import { IconButton } from "../components/Controls";
import {
  readState,
  writeState,
  routePreset,
  defaults,
  encodePreset,
  presetsMatchConfiguration,
  snapshotFavoritePreset,
} from "../state/storage";
import { clocks, safeClockOptions, clockOptionsWithWeatherEnabled, presetWithWeatherDefaults } from "../clock/definitions";
import { backgrounds, backgroundById } from "../backgrounds/definitions";
import { useWeather } from "../weather/useWeather";
import { useReducedMotion, useWakeLock, fullscreen } from "../hooks/useDisplay";
import type { KlockyPreset, UserPreferences } from "../types";
import { syncDocumentChrome } from "../utils/themeColor";
import { uiPx } from "../utils/uiScale";
const Lab = lazy(() => import("../editor/Lab"));
export default function App() {
  const [saved, setSaved] = useState(() => {
    const state = readState();
    if (
      !state.onboardingComplete &&
      !state.recent.length &&
      !state.preferences.timezone
    )
      state.preferences = { ...state.preferences, ...devicePreferences() };
    return state;
  });
  const [preset, setPreset] = useState(() => {
    const p = routePreset();
    return new URLSearchParams(location.search).has("s")
      ? (p ?? saved.preset)
      : p?.id === saved.preset.id
        ? saved.preset
        : (p ?? saved.preset);
  });
  const [view, setView] = useState<"welcome" | "gallery" | "display" | "lab">(
    () =>
      location.pathname === "/lab"
        ? "lab"
        : location.pathname === "/collection"
          ? "gallery"
          : location.pathname === "/welcome"
            ? "welcome"
            : location.pathname === "/display" ||
                saved.onboardingComplete ||
                saved.preferences.restoreLast
              ? "display"
              : "welcome",
  );
  const [editing, setEditing] = useState(false),
    [settings, setSettings] = useState(false),
    [controls, setControls] = useState(true),
    [toast, setToast] = useState(""),
    [isFullscreen, setIsFullscreen] = useState(false),
    [shareFallback, setShareFallback] = useState(""),
    [accountSyncOpen, setAccountSyncOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
    ),
    idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const enterFocus = useRef<HTMLElement>(null);
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const preferences = saved.preferences;
  const reduced = useReducedMotion(
    preferences.reduceMotion || preset.displayOptions.reduceMotion,
  );
  const notify = useCallback((text: string) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 6000);
  }, []);
  const account = useAccountSync(saved, setSaved, notify);
  const configurationFavorited = saved.savedFavorites.some((item) =>
    presetsMatchConfiguration(item, preset),
  );
  function applyFavoritePrompt(next: typeof saved, wasAdd: boolean) {
    if (!shouldPromptAfterFavoriteAdd(next, wasAdd)) return next;
    setAccountSyncOpen(true);
    return {
      ...next,
      accountSync: { ...next.accountSync, autoShown: true },
    };
  }
  function toggleConfigurationFavorite() {
    const wasAdd = !configurationFavorited;
    setSaved((s) => {
      const savedFavorites = configurationFavorited
        ? s.savedFavorites.filter(
            (item) => !presetsMatchConfiguration(item, preset),
          )
        : [...s.savedFavorites, snapshotFavoritePreset(preset)].slice(0, 100);
      return applyFavoritePrompt({ ...s, savedFavorites }, wasAdd);
    });
    notify(
      configurationFavorited
        ? "Removed from My favorites."
        : "Saved to My favorites.",
    );
  }
  const weather = useWeather(
    preset.clockOptions.showWeather,
    preferences.weatherLocation,
    preferences.unit,
  );
  useWakeLock(view === "display" && preferences.keepAwake, notify);
  useLayoutEffect(() => {
    syncDocumentChrome(view);
  }, [view]);
  useEffect(() => {
    document.documentElement.dataset.reduced = String(reduced);
  }, [reduced]);
  useEffect(() => {
    const next = { ...saved, preset };
    if (!writeState(next))
      notify(
        "This browser couldn’t save preferences. Your clock still works for this visit.",
      );
  }, [saved, preset, notify]);
  useEffect(() => {
    const changed = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", changed);
    const pop = () => {
      const nextView =
        location.pathname === "/lab"
          ? "lab"
          : location.pathname === "/collection"
            ? "gallery"
            : location.pathname === "/welcome"
              ? "welcome"
              : location.pathname === "/display"
                ? "display"
                : savedRef.current.onboardingComplete ||
                    savedRef.current.preferences.restoreLast
                  ? "display"
                  : "welcome";
      setView(nextView);
      const p = routePreset();
      if (p) setPreset(p);
      setEditing(false);
    };
    window.addEventListener("popstate", pop);
    return () => {
      document.removeEventListener("fullscreenchange", changed);
      window.removeEventListener("popstate", pop);
      clearTimeout(toastTimer.current);
      clearTimeout(idleTimer.current);
    };
  }, []);
  const wake = useCallback(() => {
    setControls(true);
    clearTimeout(idleTimer.current);
    if (view === "display" && !editing && !settings)
      idleTimer.current = setTimeout(() => {
        if (
          !(document.activeElement instanceof HTMLElement) ||
          !document.activeElement.closest(".display-controls") ||
          !document.activeElement.matches(":focus-visible")
        )
          setControls(false);
      }, 4200);
  }, [view, editing, settings]);
  useEffect(() => {
    wake();
  }, [wake]);
  function changePreferences(p: Partial<UserPreferences>) {
    setSaved((s) => ({ ...s, preferences: { ...s.preferences, ...p } }));
    setPreset((s) => {
      let clockOptions = { ...s.clockOptions };
      if (p.hour24 !== undefined) clockOptions.hour24 = p.hour24;
      if (p.seconds !== undefined) clockOptions.showSeconds = p.seconds;
      if (p.weatherLocation)
        clockOptions = clockOptionsWithWeatherEnabled(s.clockId, clockOptions);
      if (
        p.hour24 === undefined &&
        p.seconds === undefined &&
        !p.weatherLocation
      )
        return s;
      return {
        ...s,
        clockOptions: safeClockOptions(s.clockId, clockOptions),
      };
    });
  }
  function chooser() {
    setEditing(false);
    setView("gallery");
    history.pushState({}, "", "/collection");
    if (document.fullscreenElement) void document.exitFullscreen();
  }
  function select(
    p: KlockyPreset,
    element: HTMLElement,
    edit = true,
    complete = false,
  ) {
    const rect = element.getBoundingClientRect();
    const run = () => {
      const withWeather = presetWithWeatherDefaults(
        p,
        savedRef.current.preferences.weatherLocation,
      );
      flushSync(() => {
        setPreset(withWeather);
        setView("display");
        setEditing(edit);
        setControls(edit);
        setSaved((s) => ({
          ...s,
          onboardingComplete: complete || s.onboardingComplete,
          recent: [p.id, ...s.recent.filter((id) => id !== p.id)].slice(0, 8),
        }));
      });
      history.pushState({}, "", `/display?preset=${encodeURIComponent(p.id)}`);
    };
    if (!reduced && "startViewTransition" in document) {
      element.style.viewTransitionName = "clock-stage";
      const transition = (
        document as Document & {
          startViewTransition: (fn: () => void) => { finished: Promise<void> };
        }
      ).startViewTransition(run);
      void transition.finished
        .catch(() => {})
        .finally(() => {
          element.style.viewTransitionName = "";
        });
    } else {
      run();
      if (!reduced)
        document.querySelector(".display-stage")?.animate(
          [
            {
              transformOrigin: "0 0",
              transform: `translate(${rect.left}px, ${rect.top}px) scale(${rect.width / innerWidth}, ${rect.height / innerHeight})`,
              borderRadius: "18px",
            },
            {
              transformOrigin: "0 0",
              transform: "translate(0, 0) scale(1)",
              borderRadius: "0px",
            },
          ],
          { duration: 700, easing: "cubic-bezier(.22,1,.36,1)" },
        );
    }
    if (preferences.autoFullscreen) void fullscreen(notify);
  }
  useEffect(() => {
    if (view === "display") enterFocus.current?.focus({ preventScroll: true });
  }, [view]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.defaultPrevented ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        settings ||
        view !== "display" ||
        (e.target instanceof Element &&
          e.target.closest("input,select,textarea,[contenteditable]"))
      )
        return;
      const k = e.key.toLowerCase();
      if (
        [
          "f",
          "e",
          "c",
          "escape",
          "arrowleft",
          "arrowright",
          "arrowup",
          "arrowdown",
        ].includes(k)
      ) {
        e.preventDefault();
        wake();
      }
      if (k === "f") void fullscreen(notify);
      if (k === "e") setEditing((v) => !v);
      if (k === "c") chooser();
      if (k === "escape") {
        if (editing) setEditing(false);
        else chooser();
      }
      if (k === "arrowleft" || k === "arrowright")
        setPreset((p) => {
          const idx = clocks.findIndex((c) => c.id === p.clockId);
          const id =
            clocks[
              (idx + (k === "arrowright" ? 1 : -1) + clocks.length) %
                clocks.length
            ].id;
          return {
            ...p,
            clockId: id,
            clockOptions: safeClockOptions(id, p.clockOptions),
          };
        });
      if (k === "arrowup" || k === "arrowdown")
        setPreset((p) => {
          const idx = backgrounds.findIndex((b) => b.id === p.backgroundId);
          return {
            ...p,
            backgroundId:
              backgrounds[
                (idx + (k === "arrowdown" ? 1 : -1) + backgrounds.length) %
                  backgrounds.length
              ].id,
            backgroundOptions: {},
          };
        });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [view, editing, settings, wake, notify]);
  async function share() {
    const url = location.origin + "/display?s=" + encodePreset(preset);
    const favorited = configurationFavorited;
    try {
      await navigator.clipboard.writeText(url);
      notify("Link copied. A little moment to share.");
    } catch {
      setShareFallback(url);
    }
    if (shouldPromptAfterShareWithFavorite(savedRef.current, favorited)) {
      setAccountSyncOpen(true);
      setSaved((s) => ({
        ...s,
        accountSync: { ...s.accountSync, autoShown: true },
      }));
    }
  }
  function continueWithoutAccount() {
    setSaved((s) => ({
      ...s,
      accountSync: { ...s.accountSync, dismissed: true },
    }));
    setAccountSyncOpen(false);
  }
  const closeSettings = useCallback(() => setSettings(false), []);
  return (
    <>
      {view === "welcome" ? (
        <Onboarding
          preferences={preferences}
          onPreferences={changePreferences}
          reduced={reduced}
          onComplete={(p, element, edit) => select(p, element, edit, true)}
        />
      ) : view === "lab" ? (
        <Suspense fallback={<div className="loading">Opening the Lab…</div>}>
          <Lab preferences={preferences} reduced={reduced} notify={notify} />
        </Suspense>
      ) : view === "gallery" ? (
        <Gallery
          preferences={preferences}
          onSelect={select}
          onSettings={() => setSettings(true)}
          favorites={saved.favorites}
          savedFavorites={saved.savedFavorites}
          onFavorite={(id) =>
            setSaved((s) => {
              const wasAdd = !s.favorites.includes(id);
              const favorites = wasAdd
                ? [...s.favorites, id]
                : s.favorites.filter((f) => f !== id);
              return applyFavoritePrompt({ ...s, favorites }, wasAdd);
            })
          }
          onToggleSavedFavorite={(target) =>
            setSaved((s) => {
              const exists = s.savedFavorites.some((item) =>
                presetsMatchConfiguration(item, target),
              );
              const wasAdd = !exists;
              const savedFavorites = exists
                ? s.savedFavorites.filter(
                    (item) => !presetsMatchConfiguration(item, target),
                  )
                : [...s.savedFavorites, snapshotFavoritePreset(target)].slice(
                    0,
                    100,
                  );
              return applyFavoritePrompt({ ...s, savedFavorites }, wasAdd);
            })
          }
          recent={saved.recent}
        />
      ) : (
        <main
          ref={enterFocus}
          tabIndex={-1}
          className={`player ${editing ? "is-editing" : ""} ${controls || editing || settings ? "" : "is-ambient"}`}
          onPointerMove={wake}
          onPointerDown={wake}
          onKeyDown={wake}
        >
          <div
            className="display-stage"
            onClick={wake}
            data-testid="display-stage"
          >
            <Background
              id={preset.backgroundId}
              options={preset.backgroundOptions}
              reduced={reduced}
            />
            <Clock
              preset={preset}
              preferences={preferences}
              weather={weather}
            />
          </div>
          <div
            className="display-controls"
            aria-hidden={!controls && !editing && !settings}
            inert={!controls && !editing && !settings}
          >
            <div className="display-top">
              <div className="display-top-start">
                <button
                  className="quiet-button glass-button"
                  onClick={chooser}
                  onBlur={wake}
                >
                  <ArrowLeft size={uiPx(16)} /> Collection
                </button>
                <div className="display-name">
                  <span>
                    {clocks.find((c) => c.id === preset.clockId)?.name}
                  </span>
                  <small>{backgroundById(preset.backgroundId).name}</small>
                </div>
              </div>
              <div className="display-top-actions glass-panel">
                <IconButton label="Copy link" onClick={() => void share()}>
                  <LinkIcon size={uiPx(18)} />
                </IconButton>
                <IconButton
                  label="Open settings"
                  onClick={() => setSettings(true)}
                >
                  <Settings2 size={uiPx(18)} />
                </IconButton>
              </div>
            </div>
            <div className="display-bottom">
              <span className="display-hint">A moment, just for you.</span>
              <div className="display-bottom-actions">
                <div className="display-dock glass-panel">
                  <button
                    className="edit-button"
                    onClick={() => setEditing((v) => !v)}
                  >
                    <SlidersHorizontal size={uiPx(16)} /> Edit clock
                  </button>
                </div>
                <div className="display-dock-tools glass-panel">
                  <IconButton
                    label={
                      isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                    }
                    onClick={() => void fullscreen(notify)}
                  >
                    {isFullscreen ? (
                      <Minimize size={uiPx(18)} />
                    ) : (
                      <Maximize size={uiPx(18)} />
                    )}
                  </IconButton>
                  <IconButton
                    label={
                      configurationFavorited
                        ? "Remove from My favorites"
                        : "Save to My favorites"
                    }
                    aria-pressed={configurationFavorited}
                    className={
                      configurationFavorited ? "icon-button--active" : ""
                    }
                    onClick={toggleConfigurationFavorite}
                  >
                    <Heart
                      size={uiPx(18)}
                      fill={configurationFavorited ? "currentColor" : "none"}
                    />
                  </IconButton>
                </div>
              </div>
              <span className="display-shortcuts">
                E to edit <span>·</span> F for fullscreen
              </span>
            </div>
          </div>
          {editing && (
            <Editor
              preset={preset}
              onChange={setPreset}
              preferences={preferences}
              onPreferences={changePreferences}
              weather={weather}
              onClose={() => {
                setEditing(false);
                wake();
              }}
            />
          )}
        </main>
      )}
      {settings && (
        <Settings
          preferences={preferences}
          onChange={changePreferences}
          onClose={closeSettings}
          onWelcome={() => {
            setSettings(false);
            setEditing(false);
            setSaved((s) => ({ ...s, onboardingComplete: false }));
            setView("welcome");
            history.pushState({}, "", "/welcome");
            if (document.fullscreenElement) void document.exitFullscreen();
          }}
          onReset={() => {
            const d = defaults();
            setSaved(d);
            setPreset(d.preset);
            setSettings(false);
            setView("welcome");
            history.pushState({}, "", "/welcome");
            notify("A fresh start. Preferences reset.");
          }}
          onOpenAccountSync={() => {
            setSettings(false);
            setAccountSyncOpen(true);
          }}
          session={account.session}
          syncConfigured={account.syncConfigured}
          onSignOut={() => void account.signOut()}
          weather={weather}
        />
      )}
      {accountSyncOpen && (
        <AccountSyncSheet
          session={account.session}
          syncConfigured={account.syncConfigured}
          onClose={() => setAccountSyncOpen(false)}
          onContinueLocal={continueWithoutAccount}
          onSendMagicLink={account.sendMagicLink}
        />
      )}
      <div className={"toast " + (toast ? "visible" : "")} role="status">
        {toast}
      </div>
      {shareFallback && (
        <div className="share-fallback glass-panel">
          <IconButton label="Close link" onClick={() => setShareFallback("")}>
            <X size={uiPx(16)} />
          </IconButton>
          <label>
            Copy your clock link
            <input
              readOnly
              value={shareFallback}
              onFocus={(e) => e.target.select()}
            />
          </label>
        </div>
      )}
    </>
  );
}
