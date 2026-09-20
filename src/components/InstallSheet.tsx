import { useState } from "react";
import { Modal } from "./Controls";
import { isIosDevice, isIosSafariBrowser } from "../hooks/useDisplay";
import { dismissInstallHint } from "../state/storage";

export function InstallSheet({
  canPrompt,
  onPromptInstall,
  onClose,
  onInstalled,
}: {
  canPrompt: boolean;
  onPromptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  onClose: () => void;
  onInstalled?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const ios = isIosDevice();
  const iosSafari = isIosSafariBrowser();

  async function install() {
    setBusy(true);
    try {
      const outcome = await onPromptInstall();
      if (outcome === "accepted") {
        onInstalled?.();
        onClose();
      }
    } finally {
      setBusy(false);
    }
  }

  function dismissForever() {
    dismissInstallHint();
    onClose();
  }

  return (
    <Modal
      title="Install Klocky"
      layout="sheet"
      closeLabel="Close install instructions"
      onClose={onClose}
    >
      <div className="install-sheet-body">
        <p className="help-text install-sheet-lede">
          Add Klocky to your home screen for a full-screen clock without the
          browser bar.
        </p>
        {canPrompt ? (
          <>
            <button
              type="button"
              className="primary-button install-sheet-primary"
              disabled={busy}
              onClick={() => void install()}
            >
              {busy ? "Opening install…" : "Install Klocky"}
            </button>
            <p className="help-text">
              Your browser will confirm the install. You can open Klocky from
              your apps list or home screen afterward.
            </p>
          </>
        ) : ios && iosSafari ? (
          <ol className="install-sheet-steps help-text">
            <li>
              Tap <strong>Share</strong> — the square with an arrow pointing up
              at the bottom of Safari.
            </li>
            <li>
              Scroll the menu and tap <strong>Add to Home Screen</strong>.
            </li>
            <li>
              Tap <strong>Add</strong> in the top corner.
            </li>
          </ol>
        ) : ios ? (
          <>
            <p className="help-text">
              In Chrome, Edge, or Firefox on iPhone and iPad: tap{" "}
              <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
              For the classic flow, you can also open{" "}
              <strong>klocky.xyz</strong> in Safari and use Share there.
            </p>
          </>
        ) : (
          <p className="help-text">
            On desktop or Android, open your browser menu and choose{" "}
            <strong>Install app</strong> or <strong>Add to Home screen</strong>.
            If nothing appears yet, browse a clock for a moment and try again.
          </p>
        )}
        <div className="install-sheet-actions">
          <button type="button" className="quiet-button" onClick={onClose}>
            Not now
          </button>
          <button type="button" className="quiet-button" onClick={dismissForever}>
            Don&apos;t show again
          </button>
        </div>
      </div>
    </Modal>
  );
}
