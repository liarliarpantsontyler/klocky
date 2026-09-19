import { useState } from "react";
import type { AccountSession } from "../account/auth";
import { Modal } from "./Controls";

export function AccountSyncSheet({
  session,
  syncConfigured,
  onClose,
  onContinueLocal,
  onSendMagicLink,
}: {
  session: AccountSession;
  syncConfigured: boolean;
  onClose: () => void;
  onContinueLocal: () => void;
  onSendMagicLink: (email: string) => Promise<{ ok: boolean; message: string }>;
}) {
  const [email, setEmail] = useState(session?.email ?? "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function submit() {
    setBusy(true);
    setNote("");
    const result = await onSendMagicLink(email);
    setNote(result.message);
    setBusy(false);
  }

  return (
    <Modal
      title="Sync favorites"
      layout="sheet"
      closeLabel="Close sync"
      onClose={onClose}
    >
      <div className="account-sync-body">
        {session ? (
          <>
            <p className="help-text account-sync-lede">
              Signed in as <strong>{session.email ?? "your account"}</strong>.
              Favorites sync when you’re online.
            </p>
            <div className="account-sync-actions">
              <button type="button" className="primary-button" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="help-text account-sync-lede">
              Free account — same favorites on phone, tablet, and desktop. Or
              keep everything on this device only.
            </p>
            {!syncConfigured && (
              <p className="account-sync-notice" role="status">
                Sign-in isn’t live on this deploy yet. Favorites still save here;
                try again after the site finishes updating.
              </p>
            )}
            <ul className="account-sync-list help-text">
              <li>Saved favorites & custom setups</li>
              <li>Weather city & time zone</li>
            </ul>
            <label className="account-sync-email">
              <span className="field-label">Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                enterKeyHint="send"
                placeholder="you@example.com"
                value={email}
                disabled={busy}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submit();
                }}
              />
            </label>
            {note && (
              <p className="help-text account-sync-note" role="status">
                {note}
              </p>
            )}
            <div className="account-sync-actions">
              <button
                type="button"
                className="primary-button"
                disabled={busy}
                onClick={() => void submit()}
              >
                {busy ? "Sending link…" : "Email me a sign-in link"}
              </button>
              <button
                type="button"
                className="quiet-button account-sync-skip"
                onClick={onContinueLocal}
              >
                Continue without account
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
