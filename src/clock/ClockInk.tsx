import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Outline the painted silhouette, not individual (possibly overlapping) font paths. */
export function ClockInk({
  outline,
  children,
}: {
  outline: boolean;
  children: ReactNode;
}) {
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const [radius, setRadius] = useState(1);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!outline || !element) return;
    const measure = () => {
      const size = parseFloat(getComputedStyle(element).fontSize);
      setRadius(Math.max(0.65, Math.min(2.5, size * 0.009)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [outline]);

  if (!outline) return <>{children}</>;

  return (
    <>
      <svg
        className="clock-ink-filter"
        width="0"
        height="0"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <filter id={id} colorInterpolationFilters="sRGB">
            <feMorphology
              in="SourceAlpha"
              operator="erode"
              radius={radius}
              result="inside"
            />
            <feComposite in="SourceGraphic" in2="inside" operator="out" />
          </filter>
        </defs>
      </svg>
      <span ref={ref} className="clock-ink" style={{ filter: `url(#${id})` }}>
        {children}
      </span>
    </>
  );
}
