interface MotionProfile {
  description: string;
  neutral: number;
  maxRate: number;
}

const profile = (
  description: string,
  maxRate: number,
  neutral = 0.45,
): MotionProfile => ({ description, maxRate, neutral });

// Rates are tuned for the movement inside each scene, in scene seconds per second.
// Quiet materials stay restrained even at the top of the slider.
export const motionProfiles: Record<string, MotionProfile> = {
  chroma: profile("Color pools slowly flow into one another.", 3.8, 0.45),
  relay: profile(
    "Column seams rise and fall in a staggered rhythm.",
    4.2,
    0.35,
  ),
  corona: profile("The luminous edge rolls in overlapping waves.", 3.2, 0.25),
  spectrum: profile(
    "The ribbon flexes as color travels along its surface.",
    3.6,
    0.35,
  ),
  flux: profile("Liquid streams curl and fold into one another.", 5.5, 0.35),
  cobalt: profile(
    "Warm pigment blooms gently reshape in the blue field.",
    2.8,
    0.4,
  ),
  abyss: profile(
    "Underwater light currents undulate beneath a steady glow.",
    3,
    0.4,
  ),
  sundial: profile("Light and shadow revolve around a fixed center.", 6, 0.2),
  isoline: profile("Contour paths gently bend and unwind.", 2.4, 0.3),
  terrace: profile(
    "Ripples travel through the edges of the terraced rings.",
    3,
    0.3,
  ),
  lilt: profile("Soft fabric folds sway and unfurl.", 3.8, 0.3),
  weave: profile(
    "Light shimmers across fixed glass tiles, refracting the image.",
    4,
    0.3,
  ),
  mesh: profile("Warm pools of light breathe and blend.", 3.2),
  ribbon: profile("Waves travel along the silk ribbon.", 4.5),
  caustics: profile("Water ripples refract moving threads of light.", 5),
  wave: profile("Overlapping swells roll along the horizon.", 3.6),
  fluid: profile("Pigment swirls mix and fold.", 4.8),
  aurora: profile("Aurora curtains ripple across the sky.", 4),
  fog: profile("Layers of mist drift past one another.", 2.5),
  clouds: profile("Clouds roll across the sky and slowly billow.", 3.5),
  perlin: profile("Organic eddies gently evolve.", 3),
  bands: profile("Sediment layers flex in slow waves.", 2.8),
  blobs: profile("Rounded color pools orbit and overlap.", 4.5),
  metaballs: profile("Pebbles drift together, merge, and separate.", 4),
  glass: profile("Light moves behind steady glass flutes.", 3.4),
  refraction: profile("Prismatic ripples radiate through the lens.", 4.5),
  lens: profile("The lens wanders, bending the color beneath it.", 3.5),
  iridescent: profile("Pearlescent highlights change with the light.", 2.6),
  editorial: profile("Warm light gently shifts through the pigment.", 1.6),
  poster: profile("Paper-like color boundaries rise and fall.", 3),
  halftone: profile(
    "Waves of ink coverage pulse across a fixed print grid.",
    4,
  ),
  dots: profile("Points swell and fade in waves across a fixed grid.", 4),
  noise: profile("Fine texture softly shimmers in place.", 1.8),
  contours: profile("Topographic contours grow and recede.", 2.4),
  lines: profile("Waves travel along the parallel filaments.", 3.8),
  diffusion: profile("A diffuse glow slowly expands and settles.", 2.2),
  rotation: profile("Spiral arms revolve around their fixed center.", 5.5),
  monochrome: profile("The tonal gradient breathes almost imperceptibly.", 1.2),
  atmosphere: profile("The halo softly brightens and expands.", 2.2),
  paint: profile("Wet pigment flows along textured brush strokes.", 3.4),
};

const MOTION_HEADROOM = 1.45;

function motionRateLegacy(algorithm: string, level: number) {
  const { neutral, maxRate } = motionProfiles[algorithm] ?? motionProfiles.mesh;
  const clamped = Math.max(0, Math.min(2, level));
  const neutralRate = 0.04 + 2.02 * neutral * neutral;
  return clamped <= neutral
    ? neutralRate * Math.pow(clamped / neutral, 1.3)
    : neutralRate +
        (maxRate - neutralRate) * ((clamped - neutral) / (2 - neutral));
}

export function motionRate(algorithm: string, value: number) {
  const { maxRate } = motionProfiles[algorithm] ?? motionProfiles.mesh;
  const level = Math.max(0, Math.min(3, value));
  if (level <= 2) return motionRateLegacy(algorithm, level);
  const top = maxRate * MOTION_HEADROOM;
  return maxRate + (top - maxRate) * (level - 2);
}

// Integrate speed changes instead of multiplying the entire elapsed lifetime by
// the newest speed. Pausing and resuming preserve the current composition.
export class MotionTimeline {
  private time = 0;
  private last: number;
  private rate = 0;

  constructor(now: number) {
    this.last = now;
  }

  advance(now: number) {
    this.time += (Math.max(0, now - this.last) / 1000) * this.rate;
    this.last = now;
    return this.time;
  }

  setRate(rate: number, now: number) {
    this.advance(now);
    this.rate = rate;
  }

  resume(now: number) {
    this.last = now;
  }
}
