import {
  forwardRef,
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
import { CarouselMotion } from "./physics";
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
  const motion = useRef(new CarouselMotion());
  const geometry = useRef({ stride: 0, offset: 0 });
  const focused = useRef(false);
  const hover = useRef(false);
  const manualSelection = useRef(false);
  const pendingSelection = useRef<number | null>(null);
  const active = useRef(0);
  const [selected, setSelected] = useState(0);
  const count = welcomeClocks.length;
  const latest = useRef({ reduced, choosing });
  latest.current = { reduced, choosing };
  useImperativeHandle(
    handle,
    () => ({
      selected: () => {
        const elements = track.current?.querySelectorAll<HTMLElement>(
          `[data-clock-index="${active.current}"] .onboarding-clock-surface`,
        );
        if (!elements?.length) return null;
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
  function center(index: number, explicit = true) {
    const { stride, offset } = geometry.current;
    const m = motion.current;
    if (!stride) return;
    index = (index + count) % count;
    const candidates = [index, index + count, index + count * 2].map(
      (i) => i * stride - offset,
    );
    m.interact(performance.now());
    m.target = candidates.sort(
      (a, b) => Math.abs(a - m.position) - Math.abs(b - m.position),
    )[0];
    m.velocity = 0;
    if (latest.current.reduced) {
      m.position = m.target;
      m.target = null;
    }
    manualSelection.current = explicit;
    pendingSelection.current = index;
    active.current = index;
    setSelected(index);
  }
  useEffect(() => {
    const root = viewport.current!,
      rail = track.current!,
      m = motion.current;
    let frame = 0,
      previous = performance.now(),
      pointer: number | null = null;
    let lastX = 0,
      lastAt = 0,
      moved = false,
      startX = 0,
      startY = 0;
    const measure = () => {
      const card = rail.firstElementChild as HTMLElement;
      const width = card.offsetWidth;
      geometry.current = {
        stride: width + parseFloat(getComputedStyle(rail).gap),
        offset: (root.clientWidth - width) / 2,
      };
      m.position =
        (count + active.current) * geometry.current.stride -
        geometry.current.offset;
      m.velocity = 0;
      m.target = null;
      rail.style.transform = `translate3d(${-m.position}px,0,0)`;
    };
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    observer.observe(rail.firstElementChild!);
    measure();
    const animate = (now: number) => {
      const { stride, offset } = geometry.current;
      const auto =
        !latest.current.reduced &&
        !focused.current &&
        !hover.current &&
        !(latest.current.choosing && manualSelection.current) &&
        !document.hidden;
      if (!document.hidden)
        m.advance((now - previous) / 1000, now, stride, offset, auto);
      previous = now;
      m.wrap(stride * count, offset);
      rail.style.transform = `translate3d(${-m.position}px,0,0)`;
      if (m.target === null) pendingSelection.current = null;
      const index =
        pendingSelection.current ??
        ((Math.round((m.position + offset) / stride) % count) + count) % count;
      if (index !== active.current) {
        active.current = index;
        setSelected(index);
      }
      frame = requestAnimationFrame(animate);
    };
    const down = (e: PointerEvent) => {
      if (!e.isPrimary || e.button !== 0) return;
      pointer = e.pointerId;
      moved = false;
      pendingSelection.current = null;
      if (latest.current.choosing) manualSelection.current = true;
      startX = lastX = e.clientX;
      startY = e.clientY;
      lastAt = performance.now();
      m.dragging = true;
      m.velocity = 0;
      m.interact(lastAt);
    };
    const move = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      const now = performance.now(),
        dx = e.clientX - lastX;
      if (
        !moved &&
        Math.abs(e.clientY - startY) > Math.abs(e.clientX - startX) + 8
      ) {
        up(e);
        return;
      }
      if (Math.abs(e.clientX - startX) > 5) {
        moved = true;
        if (!root.hasPointerCapture(e.pointerId))
          root.setPointerCapture(e.pointerId);
        root.dataset.dragging = "true";
      }
      if (moved) {
        m.position -= dx;
        m.velocity =
          0.35 * m.velocity +
          0.65 *
            Math.max(
              -4500,
              Math.min(4500, (-dx / Math.max(8, now - lastAt)) * 1000),
            );
        m.lastInput = now;
      }
      lastX = e.clientX;
      lastAt = now;
    };
    const up = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      if (performance.now() - lastAt > 100 || e.type === "pointercancel")
        m.velocity = 0;
      m.dragging = false;
      m.lastInput = performance.now();
      pointer = null;
      root.dataset.dragging = "false";
      if (root.hasPointerCapture(e.pointerId))
        root.releasePointerCapture(e.pointerId);
    };
    const click = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    };
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      // Vertical wheels scroll the carousel only when the page itself has no overflow.
      if (
        Math.abs(e.deltaY) > Math.abs(e.deltaX) &&
        document.documentElement.scrollHeight > innerHeight + 2
      )
        return;
      e.preventDefault();
      pendingSelection.current = null;
      if (latest.current.choosing) manualSelection.current = true;
      m.interact(performance.now());
      m.velocity = 0;
      const delta =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      m.position +=
        delta *
        (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? root.clientWidth : 1);
    };
    root.addEventListener("pointerdown", down);
    root.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    root.addEventListener("lostpointercapture", up);
    root.addEventListener("click", click, true);
    root.addEventListener("wheel", wheel, { passive: false });
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      m.dragging = false;
      root.removeEventListener("pointerdown", down);
      root.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      root.removeEventListener("lostpointercapture", up);
      root.removeEventListener("click", click, true);
      root.removeEventListener("wheel", wheel);
    };
  }, []);
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
          motion.current.lastInput = performance.now();
        }}
        onFocus={(e) => {
          focused.current = e.target.matches(":focus-visible");
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            focused.current = false;
            motion.current.lastInput = performance.now();
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
                    <Check size={13} strokeWidth={2.5} />
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
          <ChevronLeft size={15} />
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
          <ChevronRight size={15} />
        </button>
      </div>
    </section>
  );
});
