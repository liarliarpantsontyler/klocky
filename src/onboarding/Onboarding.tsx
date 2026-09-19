import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { KlockyPreset, UserPreferences } from "../types";
import { ClockCarousel } from "./ClockCarousel";
import {
  ChooseClockList,
  type ChooseClockListHandle,
  type ClockListSelection,
} from "./ChooseClockList";
import { LocationStep } from "./LocationStep";
import { BrandLogo } from "../components/BrandLogo";
import { neutralClock } from "./presets";
import "./onboarding.css";
export function Onboarding({
  preferences,
  onPreferences,
  reduced,
  onComplete,
}: {
  preferences: UserPreferences;
  onPreferences: (value: Partial<UserPreferences>) => void;
  reduced: boolean;
  onComplete: (
    preset: KlockyPreset,
    element: HTMLElement,
    edit: boolean,
  ) => void;
}) {
  const [step, setStep] = useState<"welcome" | "location" | "choose">(
    "welcome",
  );
  const clockList = useRef<ChooseClockListHandle>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  const finishing = useRef(false);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus({ preventScroll: true });
  }, [step]);
  function complete(selection: ClockListSelection | null, edit = false) {
    if (!selection || finishing.current) return;
    finishing.current = true;
    const preset = edit ? neutralClock : selection.preset;
    onComplete(
      {
        ...structuredClone(preset),
        clockOptions: { ...preset.clockOptions, hour24: preferences.hour24 },
      },
      selection.element,
      edit,
    );
  }

  function startRandom() {
    const selection = clockList.current?.random() ?? null;
    if (!selection) return;
    selection.element.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "center",
    });
    window.setTimeout(() => complete(selection), reduced ? 0 : 420);
  }

  function buildMyOwn() {
    complete(clockList.current?.first() ?? null, true);
  }
  return (
    <main className={`onboarding onboarding-${step}`} data-reduced={reduced}>
      <header className="onboarding-header">
        {step !== "welcome" && (
          <button
            className="onboarding-back"
            aria-label="Back"
            onClick={() => setStep(step === "choose" ? "location" : "welcome")}
          >
            <ArrowLeft size={19} />
          </button>
        )}
        <BrandLogo hero />
      </header>
      {step !== "choose" && (
        <ClockCarousel
          preferences={preferences}
          reduced={reduced}
          choosing={false}
          onClockTap={
            step === "welcome" ? () => setStep("location") : undefined
          }
        />
      )}
      <div
        className={`onboarding-content ${step === "choose" ? "onboarding-choose-intro" : ""}`}
        key={step}
      >
        <h1 ref={heading} tabIndex={-1}>
          {step === "welcome"
            ? "Your time, your way."
            : step === "location"
              ? "First, set your time. Where are you?"
              : "Pick one."}
        </h1>
        <p className="onboarding-copy">
          {step === "welcome"
            ? "Set your time and place, then pick a clock to make your own."
            : step === "location"
              ? 'Tap "Use My Location" or set it manually below:'
              : "You can change everything later."}
        </p>
        {step === "location" ? (
          <LocationStep
            preferences={preferences}
            onChange={onPreferences}
            onNext={() => setStep("choose")}
          />
        ) : step === "choose" ? (
          <div className="onboarding-actions onboarding-choose-actions">
            <button className="onboarding-primary" onClick={startRandom}>
              Start with a random clock <ArrowRight size={18} />
            </button>
            <button
              className="onboarding-secondary onboarding-secondary-button"
              onClick={buildMyOwn}
            >
              Build my own <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <div className="onboarding-actions">
            <button
              className="onboarding-primary"
              onClick={() => setStep("location")}
            >
              Get Started <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
      {step === "choose" && (
        <ChooseClockList
          ref={clockList}
          preferences={preferences}
          reduced={reduced}
          onChoose={(selection) => complete(selection)}
        />
      )}
      <footer className="onboarding-footer">
        A little time. Beautifully spent.
      </footer>
    </main>
  );
}
