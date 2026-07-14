"use client";

import { useState } from "react";
import { createClient } from "../app/lib/supabase/client";
import { useLanguage } from "./LanguageProvider";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const { t } = useLanguage();
  const [emailInput, setEmailInput] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function signIn() {
    if (!emailInput.trim()) {
      setMessage(t("auth.enterEmail"));
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOtp({
        email: emailInput.trim(),
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setMessage(t("auth.checkEmail"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("auth.sendFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="auth-modal-close" onClick={onClose} aria-label={t("auth.close")}>
          ×
        </button>
        <p className="eyebrow">{t("auth.modalEyebrow")}</p>
        <h2 id="auth-modal-title">{t("auth.modalTitle")}</h2>
        <p className="auth-modal-body">{t("auth.modalBody")}</p>
        <ul className="auth-modal-perks">
          <li>{t("auth.perk1")}</li>
          <li>{t("auth.perk2")}</li>
          <li>{t("auth.perk3")}</li>
        </ul>
        <label className="auth-modal-label" htmlFor="auth-email">
          {t("auth.emailLabel")}
        </label>
        <input
          id="auth-email"
          type="email"
          value={emailInput}
          onChange={(event) => setEmailInput(event.target.value)}
          placeholder={t("auth.emailPlaceholder")}
          aria-label={t("auth.emailAria")}
          onKeyDown={(event) => {
            if (event.key === "Enter") void signIn();
          }}
        />
        <button type="button" className="auth-modal-submit" onClick={() => void signIn()} disabled={loading}>
          {loading ? t("auth.sending") : t("auth.sendLink")}
        </button>
        {message && <p className="auth-modal-message">{message}</p>}
        <p className="auth-modal-privacy">{t("auth.privacyNote")}</p>
      </section>
    </div>
  );
}
