import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Background } from "../backgrounds/Background";
import { backgroundStyle } from "../backgrounds/definitions";
import { Clock } from "../clock/Clock";
import type { KlockyPreset, UserPreferences } from "../types";
import { welcomeClocks } from "./presets";
import { uiPx } from "../utils/uiScale";

const AUTO_SCROLL_PX_PER_SEC = 13;
const IDLE_BEFORE_AUTO_MS = 4500;
const SCROLL_SETTLE_MS = 150;

export interface CarouselHandle {
  selected: () => { preset: KlockyPreset; element: HTMLElement } | null;
}

export function ClockPreview({
  preset,
  preferences,
  reduced,
}: {
  preset: KlockyPreset;
  preferences: UserPreferences;
  reduced: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "120px" },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className="onboarding-clock-surface"
      style={backgroundStyle(preset.backgroundId)}
    >
      {visible && (
        <>
          <Background
            id={preset.backgroundId}
            options={preset.backgroundOptions}
            reduced={reduced}
          />
          <Clock
            preset={{
              ...preset,
              clockOptions: {
                ...preset.clockOptions,
                hour24: preferences.hour24,
              },
            }}
            preferences={preferences}
            thumbnail
          />
        </>
      )}
    </div>
  );
}

function cardStride(rail: HTMLElement) {
  const card = rail.querySelector<HTMLElement>(".onboarding-clock-card");
  if (!card) return 0;
  const gap = parseFloat(getComputedStyle(rail).columnGap || getComputedStyle(rail).gap) || 0;
  return card.offsetWidth + gap;
}

function nearestCard(
  viewport: HTMLElement,
  rail: HTMLElement,
): HTMLElement | null {
  const viewportCenter =
    viewport.getBoundingClientRect().left + viewport.clientWidth / 2;
  let nearest: HTMLElement | null = null;
  let nearestDistance = Infinity;
  for (const card of rail.querySelectorAll<HTMLElement>(".onboarding-clock-card")) {
    const cardCenter =
      card.getBoundingClientRect().left + card.getBoundingClientRect().width / 2;
    const distance = Math.abs(cardCenter - viewportCenter);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = card;
    }
  }
  return nearest;
}

export const ClockCarousel = forwardRef<
  CarouselHandle,
  {
    preferences: UserPreferences;
    reduced: boolean;
    choosing: boolean;
    onClockTap?: () => void;
  }
>(function ClockCarousel({ preferences, reduced, choosing, onClockTap }, handle) {
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const focused = useRef(false);
  const hover = useRef(false);
  const manualSelection = useRef(false);
  const active = useRef(0);
  const [selected, setSelected] = useState(0);
  const count = welcomeClocks.length;
  const latest = useRef({ reduced, choosing });
  latest.current = { reduced, choosing };

  const interaction = useRef({
    pausedUntil: 0,
    scrolling: false,
    programmatic: false,
    scrollLeftAtPointer: 0,
    settleTimer: 0 as ReturnType<typeof setTimeout> | 0,
  });

  const pauseInteraction = useCallback((ms = IDLE_BEFORE_AUTO_MS) => {
    interaction.current.pausedUntil = performance.now() + ms;
  }, []);

  const syncSelectedFromScroll = useCallback(() => {
    const root = viewport.current;
    const rail = track.current;
    if (!root || !rail) return;
    const card = nearestCard(root, rail);
    if (!card) return;
    const index = Number(card.dataset.clockIndex);
    if (!Number.isNaN(index) && index !== active.current) {
      active.current = index;
      setSelected(index);
    }
  }, []);

  const normalizeInfiniteScroll = useCallback(() => {
    const root = viewport.current;
    const rail = track.current;
    if (!root || !rail) return;
    const stride = cardStride(rail);
    if (!stride) return;
    const card = nearestCard(root, rail);
    if (!card) return;
    const copy = Number(card.dataset.clockCopy);
    const setWidth = stride * count;
    if (copy === 0) {
      interaction.current.programmatic = true;
      root.scrollLeft += setWidth;
      interaction.current.programmatic = false;
    } else if (copy === 2) {
      interaction.current.programmatic = true;
      root.scrollLeft -= setWidth;
      interaction.current.programmatic = false;
    }
  }, [count]);

  const center = useCallback(
    (index: number, explicit = true) => {
      const root = viewport.current;
      const rail = track.current;
      if (!root || !rail) return;
      index = (index + count) % count;
      const target = rail.querySelector<HTMLElement>(
        `[data-clock-copy="1"][data-clock-index="${index}"]`,
      );
      if (!target) return;
      pauseInteraction();
      if (explicit && latest.current.choosing) manualSelection.current = true;
      active.current = index;
      setSelected(index);
      interaction.current.programmatic = true;
      target.scrollIntoView({
        behavior: latest.current.reduced ? "auto" : "smooth",
        inline: "center",
        block: "nearest",
      });
      interaction.current.programmatic = false;
    },
    [count, pauseInteraction],
  );

  useImperativeHandle(
    handle,
    () => ({
      selected: () => {
        const rail = track.current;
        if (!rail) return null;
        const elements = rail.querySelectorAll<HTMLElement>(
          `[data-clock-index="${active.current}"] .onboarding-clock-surface`,
        );
        if (!elements.length) return null;
        const element = [...elements].sort(
          (a, b) =>
            Math.abs(
              a.getBoundingClientRect().left +
                a.clientWidth / 2 -
                innerWidth / 2,
            ) -
            Math.abs(
              b.getBoundingClientRect().left +
                b.clientWidth / 2 -
                innerWidth / 2,
            ),
        )[0];
        return { preset: welcomeClocks[active.current], element };
      },
    }),
    [],
  );

  useEffect(() => {
    const root = viewport.current!;
    const rail = track.current!;
    const state = interaction.current;

    const updateEdgePadding = () => {
      const card = rail.querySelector<HTMLElement>(".onboarding-clock-card");
      if (!card) return;
      const edge = Math.max(0, (root.clientWidth - card.offsetWidth) / 2);
      root.style.setProperty("--carousel-edge", `${edge}px`);
    };

    const scrollToMiddleCopy = (index = active.current) => {
      const target = rail.querySelector<HTMLElement>(
        `[data-clock-copy="1"][data-clock-index="${index}"]`,
      );
      target?.scrollIntoView({ inline: "center", block: "nearest" });
      syncSelectedFromScroll();
    };

    updateEdgePadding();
    scrollToMiddleCopy(0);

    const observer = new ResizeObserver(() => {
      updateEdgePadding();
    });
    observer.observe(root);
    const firstCard = rail.querySelector(".onboarding-clock-card");
    if (firstCard) observer.observe(firstCard);

    const markScrolling = () => {
      if (!state.programmatic) {
        state.scrolling = true;
        if (state.settleTimer) clearTimeout(state.settleTimer);
        state.settleTimer = setTimeout(() => {
          state.scrolling = false;
          normalizeInfiniteScroll();
        }, SCROLL_SETTLE_MS);
        pauseInteraction();
      }
      syncSelectedFromScroll();
    };

    const onScrollEnd = () => {
      state.scrolling = false;
      if (state.settleTimer) clearTimeout(state.settleTimer);
      normalizeInfiniteScroll();
      syncSelectedFromScroll();
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      if (
        Math.abs(e.deltaY) > Math.abs(e.deltaX) &&
        document.documentElement.scrollHeight > innerHeight + 2
      )
        return;
      e.preventDefault();
      pauseInteraction();
      if (latest.current.choosing) manualSelection.current = true;
      const delta =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      root.scrollLeft +=
        delta *
        (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? root.clientWidth : 1);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!e.isPrimary) return;
      state.scrollLeftAtPointer = root.scrollLeft;
      pauseInteraction();
      if (latest.current.choosing) manualSelection.current = true;
    };

    const onClickCapture = (e: MouseEvent) => {
      if (Math.abs(root.scrollLeft - state.scrollLeftAtPointer) > 3) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    root.addEventListener("scroll", markScrolling, { passive: true });
    root.addEventListener("scrollend", onScrollEnd);
    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("click", onClickCapture, true);

    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.032);
      previous = now;
      const auto =
        !latest.current.reduced &&
        !focused.current &&
        !hover.current &&
        !(latest.current.choosing && manualSelection.current) &&
        !document.hidden;
      const idle =
        now >= state.pausedUntil && !state.scrolling && !state.programmatic;
      if (auto && idle) {
        state.programmatic = true;
        root.scrollLeft += AUTO_SCROLL_PX_PER_SEC * dt;
        state.programmatic = false;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      if (state.settleTimer) clearTimeout(state.settleTimer);
      root.removeEventListener("scroll", markScrolling);
      root.removeEventListener("scrollend", onScrollEnd);
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("click", onClickCapture, true);
    };
  }, [normalizeInfiniteScroll, pauseInteraction, syncSelectedFromScroll]);

  return (
    <section className="onboarding-carousel" aria-label="Explore clock designs">
      <div
        ref={viewport}
        className="onboarding-carousel-viewport"
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label={`${welcomeClocks[selected].name} clock. Use left and right arrows to explore.`}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") hover.current = true;
        }}
        onPointerLeave={() => {
          hover.current = false;
          pauseInteraction();
        }}
        onFocus={(e) => {
          focused.current = e.target.matches(":focus-visible");
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            focused.current = false;
            pauseInteraction();
          }
        }}
        onKeyDown={(e) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
            e.preventDefault();
            center(
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? count - 1
                  : active.current + (e.key === "ArrowRight" ? 1 : -1),
            );
          }
        }}
      >
        <div ref={track} className="onboarding-carousel-track">
          {Array.from({ length: 3 }, (_, copy) =>
            welcomeClocks.map((preset, i) => (
              <button
                key={`${copy}-${preset.id}`}
                type="button"
                tabIndex={-1}
                data-clock-index={i}
                data-clock-copy={copy}
                className={`onboarding-clock-card ${selected === i ? "is-selected" : ""}`}
                aria-label={
                  onClockTap
                    ? `Continue with ${preset.name} clock`
                    : `Select ${preset.name} clock`
                }
                aria-pressed={selected === i}
                onClick={() => (onClockTap ? onClockTap() : center(i))}
              >
                <ClockPreview
                  preset={preset}
                  preferences={preferences}
                  reduced={reduced}
                />
                {choosing && selected === i && (
                  <span className="onboarding-selection">
                    <Check size={uiPx(13)} strokeWidth={2.5} />
                  </span>
                )}
              </button>
            )),
          )}
        </div>
      </div>
      <div className="onboarding-carousel-caption">
        <button
          aria-label="Previous clock"
          onClick={() => center(active.current - 1)}
        >
          <ChevronLeft size={uiPx(15)} />
        </button>
        <span>
          <span className="onboarding-clock-number">
            {String(selected + 1).padStart(2, "0")}
          </span>
          {welcomeClocks[selected].name}
        </span>
        <button
          aria-label="Next clock"
          onClick={() => center(active.current + 1)}
        >
          <ChevronRight size={uiPx(15)} />
        </button>
      </div>
    </section>
  );
});
