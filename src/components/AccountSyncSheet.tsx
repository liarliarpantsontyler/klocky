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
    <Modal title="Keep favorites across devices" onClose={onClose}>
      <div className="account-sync-body">
        {session ? (
          <>
            <p className="help-text">
              Signed in as <strong>{session.email ?? "your account"}</strong>.
              Favorites and weather preferences sync when you’re online.
            </p>
            <div className="account-sync-actions">
              <button type="button" className="primary-button" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="help-text">
              Create a free account — your clocks follow you to phone, tablet,
              and desktop. Everything still works without signing in.
            </p>
            {!syncConfigured && (
              <p className="help-text" role="status">
                Sync isn’t configured in this build yet (missing Supabase env
                vars).
              </p>
            )}
            <ul className="account-sync-list help-text">
              <li>Saved favorites and custom clock setups</li>
              <li>Weather city and time zone preferences</li>
              <li>No raw GPS in shared links — only what you choose to save</li>
            </ul>
            <label className="select-row account-sync-email">
              Email
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                disabled={!syncConfigured || busy}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submit();
                }}
              />
            </label>
            {note && (
              <p className="help-text" role="status">
                {note}
              </p>
            )}
            <div className="account-sync-actions">
              <button
                type="button"
                className="primary-button"
                disabled={!syncConfigured || busy}
                onClick={() => void submit()}
              >
                {busy ? "Sending link…" : "Email me a sign-in link"}
              </button>
              <button
                type="button"
                className="quiet-button"
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
