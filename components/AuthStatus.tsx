"use client";

import { useState } from "react";
import { createClient } from "../app/lib/supabase/client";
import { useLanguage } from "./LanguageProvider";
import { useAuth } from "./useAuth";

type AuthStatusProps = {
  onOpenSpace?: () => void;
};

export default function AuthStatus({ onOpenSpace }: AuthStatusProps) {
  const { t } = useLanguage();
  const { user, email, configured, loading: authLoading } = useAuth();
  const [emailInput, setEmailInput] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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

  async function signOut() {
    setLoading(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setEmailInput("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("auth.signOutFailed"));
    } finally {
      setLoading(false);
    }
  }

  if (!configured) return null;

  return (
    <div className="auth-status">
      {user && email ? (
        <>
          <button type="button" className="auth-space-link" onClick={onOpenSpace}>
            {t("auth.mySpace")}
          </button>
          <span className="auth-user">{email}</span>
          <button type="button" onClick={() => void signOut()} disabled={loading || authLoading}>
            {t("auth.signOut")}
          </button>
        </>
      ) : (
        <>
          <input
            type="email"
            value={emailInput}
            onChange={(event) => setEmailInput(event.target.value)}
            placeholder={t("auth.emailPlaceholder")}
            aria-label={t("auth.emailAria")}
          />
          <button type="button" onClick={() => void signIn()} disabled={loading || authLoading}>
            {loading ? t("auth.sending") : t("auth.signIn")}
          </button>
        </>
      )}
      {message && <small>{message}</small>}
    </div>
  );
}
