import { useEffect, useRef, useState } from "react";
import type { BackgroundOptions } from "../types";
import { backgroundById, backgroundStyle } from "./definitions";
import type { ShaderRenderer } from "../shaders/renderer";
export function Background(props: Parameters<typeof ShaderBackground>[0]) {
  const def = backgroundById(props.id);
  if (def.staticBackground) {
    const customColor = props.options?.palette?.[0];
    const canReplaceWithColor = !def.staticBackground.includes("url(");
    return (
      <div
        className="background"
        style={
          customColor && canReplaceWithColor
            ? { background: customColor }
            : backgroundStyle(props.id)
        }
        aria-hidden="true"
      />
    );
  }
  return <ShaderBackground {...props} />;
}
function ShaderBackground({
  id,
  options = {},
  reduced = false,
  captureRef,
  photoSource,
}: {
  id: string;
  options?: Partial<BackgroundOptions>;
  reduced?: boolean;
  captureRef?: React.RefObject<(() => string) | null>;
  photoSource?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    renderer = useRef<ShaderRenderer | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const def = backgroundById(id);
  const latest = useRef({ def, options, reduced });
  latest.current = { def, options, reduced };
  useEffect(() => {
    let cancelled = false;
    let detachPointer = () => {};
    import("../shaders/renderer").then(({ ShaderRenderer }) => {
      if (cancelled || !canvas.current) return;
      try {
        const r = new ShaderRenderer(canvas.current);
        renderer.current = r;
        const stage = canvas.current.parentElement?.parentElement;
        const move = (event: PointerEvent) => {
          const rect = canvas.current?.getBoundingClientRect();
          if (rect && !latest.current.reduced)
            r.pointer(
              (event.clientX - rect.left) / rect.width,
              1 - (event.clientY - rect.top) / rect.height,
            );
        };
        stage?.addEventListener("pointermove", move);
        detachPointer = () => stage?.removeEventListener("pointermove", move);
        const { def, options, reduced } = latest.current;
        r.set(def.algorithm, { ...def.defaultUniforms, ...options });
        r.setReducedMotion(reduced);
        if (captureRef) captureRef.current = () => r.capture();
        setReady(true);
      } catch {
        setFailed(true);
      }
    });
    return () => {
      cancelled = true;
      detachPointer();
      renderer.current?.dispose();
      renderer.current = null;
      if (captureRef) captureRef.current = null;
    };
  }, [captureRef]);
  useEffect(() => {
    const r = renderer.current;
    if (!r) return;
    try {
      setCover(r.capture());
      r.set(def.algorithm, { ...def.defaultUniforms, ...options });
      r.setReducedMotion(reduced);
      setFailed(false);
    } catch {
      setFailed(true);
    }
    const timer = setTimeout(() => setCover(null), 750);
    return () => clearTimeout(timer);
  }, [id, ready]);
  useEffect(() => {
    renderer.current?.update({ ...def.defaultUniforms, ...options });
    renderer.current?.setReducedMotion(reduced);
  }, [options, reduced, def]);
  useEffect(() => {
    const r = renderer.current;
    if (!r) return;
    if (!photoSource) {
      r.setImage(null);
      return;
    }
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (!cancelled) r.setImage(image);
    };
    image.src = photoSource;
    return () => {
      cancelled = true;
    };
  }, [photoSource, ready]);
  return (
    <div className="background" style={backgroundStyle(id)} aria-hidden="true">
      <canvas ref={canvas} className={failed ? "shader-failed" : ""} />
      {cover && <img key={cover} className="shader-cover" src={cover} alt="" />}
    </div>
  );
}
