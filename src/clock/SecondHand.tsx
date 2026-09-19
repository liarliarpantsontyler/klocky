import { useLayoutEffect, useRef } from "react";
import { useReducedMotion } from "../hooks/useDisplay";
// The browser interpolates between system-time readings; React never renders per frame.
export function SecondHand({ now, reduced }: { now: Date; reduced: boolean }) {
  const ref = useRef<SVGLineElement>(null);
  const still = useReducedMotion(reduced);
  const angle = (now.getSeconds() + now.getMilliseconds() / 1000) * 6;
  useLayoutEffect(() => {
    if (still || !ref.current?.animate) return;
    const actual = new Date();
    const from = (actual.getSeconds() + actual.getMilliseconds() / 1000) * 6;
    const animation = ref.current.animate(
      [
        { transform: `rotate(${from}deg)` },
        { transform: `rotate(${from + 6}deg)` },
      ],
      { duration: 1000, easing: "linear", fill: "forwards" },
    );
    return () => animation.cancel();
  }, [now, still]);
  return (
    <line
      ref={ref}
      className="second-hand"
      x1="150"
      y1="173"
      x2="150"
      y2="31"
      style={{
        transform: `rotate(${angle}deg)`,
        transformOrigin: "150px 150px",
      }}
      stroke="#e68a63"
      strokeWidth="1.5"
    />
  );
}
