import { useLayoutEffect, useRef, useState } from "react";
export function useAspect() {
  const ref = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState("landscape");
  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      setAspect(
        width / height < 0.85
          ? "portrait"
          : width / height > 2.2
            ? "wide"
            : "landscape",
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("orientationchange", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", measure);
    };
  }, []);
  return { ref, aspect };
}
