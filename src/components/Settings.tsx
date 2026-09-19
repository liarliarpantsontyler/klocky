import { useState } from "react";
import type { UserPreferences, WeatherState } from "../types";
import { Modal, Toggle } from "./Controls";
import { WeatherControls } from "../editor/WeatherControls";
export function Settings({
  preferences,
  onChange,
  onClose,
  onReset,
  onWelcome,
  weather,
}: {
  preferences: UserPreferences;
  onChange: (p: Partial<UserPreferences>) => void;
  onClose: () => void;
  onReset: () => void;
  onWelcome: () => void;
  weather: WeatherState;
}) {
  const [reset, setReset] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal title="A few preferences." onClose={onClose}>
      <div className="settings-body">
        <p className="help-text">For all your moments. Saved on this device.</p>
        <Toggle
          label="24-hour time"
          checked={preferences.hour24}
          onChange={(v) => onChange({ hour24: v })}
        />
        <Toggle
          label="Seconds by default"
          checked={preferences.seconds}
          onChange={(v) => onChange({ seconds: v })}
        />
        <label className="select-row">
          Language
          <select
            aria-label="Locale"
            value={preferences.locale}
            onChange={(e) => onChange({ locale: e.target.value })}
          >
            <option value="">System default</option>
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="fr-FR">Français</option>
            <option value="de-DE">Deutsch</option>
            <option value="es-ES">Español</option>
            <option value="ja-JP">日本語</option>
          </select>
        </label>
        <label className="select-row">
          Time zone
          <input
            aria-label="Time zone"
            list="timezones"
            placeholder="System local"
            defaultValue={preferences.timezone}
            onBlur={(e) => {
              try {
                if (e.target.value)
                  new Intl.DateTimeFormat(undefined, {
                    timeZone: e.target.value,
                  });
                onChange({ timezone: e.target.value });
                setError("");
              } catch {
                setError("Use an IANA zone, such as America/Chicago.");
              }
            }}
          />
        </label>
        <datalist id="timezones">
          {[
            "America/Chicago",
            "America/New_York",
            "America/Los_Angeles",
            "Europe/London",
            "Europe/Paris",
            "Asia/Tokyo",
            "Australia/Sydney",
            "UTC",
          ].map((z) => (
            <option key={z} value={z} />
          ))}
        </datalist>
        {error && (
          <p role="alert" className="help-text">
            {error}
          </p>
        )}
        <Toggle
          label="Background motion"
          note="Turn off for a completely still display. Your device setting is always respected."
          checked={!preferences.reduceMotion}
          onChange={(v) => onChange({ reduceMotion: !v })}
        />
        <Toggle
          label="Keep display awake"
          note="While the clock is visible, where supported."
          checked={preferences.keepAwake}
          onChange={(v) => onChange({ keepAwake: v })}
        />
        <Toggle
          label="Fullscreen on selection"
          note="Available after a tap, in supported browsers."
          checked={preferences.autoFullscreen}
          onChange={(v) => onChange({ autoFullscreen: v })}
        />
        <Toggle
          label="Restore last clock"
          checked={preferences.restoreLast}
          onChange={(v) => onChange({ restoreLast: v })}
        />
        <details>
          <summary>Weather & location</summary>
          <WeatherControls
            preferences={preferences}
            onChange={onChange}
            weather={weather}
          />
        </details>
        <details>
          <summary>Install Klocky</summary>
          <p className="help-text">
            On iPhone or iPad, open in Safari, tap Share, then Add to Home
            Screen. On desktop or Android, use your browser’s Install app
            option. Once loaded, your clock works offline; fresh weather needs a
            connection.
          </p>
        </details>
        <details>
          <summary>Keyboard shortcuts</summary>
          <p className="help-text">
            F — fullscreen · E — edit · C — collection
            <br />← / → — clock · ↑ / ↓ — background
            <br />
            Escape — close the current layer
          </p>
        </details>
        <div className="reset-row">
          <button onClick={onWelcome}>Show Welcome Again</button>
        </div>
        <div className="reset-row">
          {reset ? (
            <>
              <span>Reset this device’s preferences?</span>
              <button onClick={onReset}>Reset</button>
              <button onClick={() => setReset(false)}>Cancel</button>
            </>
          ) : (
            <button onClick={() => setReset(true)}>Reset preferences</button>
          )}
        </div>
        <p className="settings-foot">
          Klocky · V1 preview
          <br />
          All designs unlocked. No account. No tracking.
        </p>
      </div>
    </Modal>
  );
}
