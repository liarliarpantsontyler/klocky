export type ClockId =
  | "meridian"
  | "fold"
  | "orbit"
  | "stack"
  | "editorial"
  | "sentence"
  | "mono"
  | "swiss"
  | "glass"
  | "edge"
  | "grid"
  | "ticker"
  | "minimal"
  | "words"
  | "world";
export type FontId =
  | "sans"
  | "geometric"
  | "serif"
  | "mono"
  | "condensed"
  | "libre-baskerville"
  | "rubik-80s-fade"
  | "rubik-mono-one"
  | "silkscreen"
  | "jersey-20"
  | "danfo"
  | "days-one"
  | "tiempos-headline"
  | "american-typewriter"
  | "black-valentine";
export type FillStyle = "solid" | "translucent" | "outline";
export interface ClockDefinition {
  id: ClockId;
  name: string;
  description: string;
  category: "Digital" | "Analog" | "Typographic";
  premium: boolean;
  allowedFills: FillStyle[];
  allowedFonts: FontId[];
  allowedColors: string[];
  supportsSeconds: boolean;
  supportsWeather: boolean;
  supportsGlass: boolean;
  portrait: string;
  landscape: string;
}
export interface ShaderUniformDefinition {
  key: keyof BackgroundOptions;
  label: string;
  min: number;
  max: number;
  step: number;
}
export interface BackgroundOptions {
  palette: string[];
  motion: number;
  scale: number;
  noise: number;
  grain: number;
  seed: number;
  warp: number;
  warpScale: number;
  distortion: number;
  noiseScale: number;
  direction: number;
  softness: number;
  contrast: number;
  luminosity: number;
  saturation: number;
  intensity: number;
  interpolation: number;
}
export interface BackgroundDefinition {
  id: string;
  name: string;
  family: string;
  algorithm: string;
  fragmentShader: string;
  defaultUniforms: BackgroundOptions;
  customizableUniforms: ShaderUniformDefinition[];
  suggestedClockColors: string[];
  previewImage: string;
  premium: boolean;
  staticBackground?: string;
  reducedMotionFallback: string;
}
export interface ClockOptions {
  font: FontId;
  /** Responsive size control: 100 is the intended layout; the maximum fills the viewport. */
  fontSize: number;
  weight: number;
  color: string;
  opacity: number;
  fill: FillStyle;
  glass: "frosted" | "clear";
  showSeconds: boolean;
  showDate: boolean;
  showWeather: boolean;
  showLocation: boolean;
  hour24: boolean;
}
export interface DisplayOptions {
  reduceMotion: boolean;
}
export interface KlockyPreset {
  version: 1;
  id: string;
  name: string;
  clockId: ClockId;
  backgroundId: string;
  clockOptions: ClockOptions;
  backgroundOptions: Partial<BackgroundOptions>;
  displayOptions: DisplayOptions;
}
export type DisplayConfiguration = KlockyPreset;
export interface WeatherLocation {
  name: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}
export interface UserPreferences {
  hour24: boolean;
  unit: "celsius" | "fahrenheit";
  locale: string;
  timezone: string;
  seconds: boolean;
  reduceMotion: boolean;
  keepAwake: boolean;
  autoFullscreen: boolean;
  restoreLast: boolean;
  weatherLocation: WeatherLocation | null;
}
export interface WeatherState {
  status: "idle" | "loading" | "ready" | "error";
  temperature?: number;
  condition?: string;
  location?: string;
  updatedAt?: number;
}
export interface SavedState {
  onboardingComplete: boolean;
  version: 1;
  preset: KlockyPreset;
  preferences: UserPreferences;
  recent: string[];
  favorites: string[];
}
