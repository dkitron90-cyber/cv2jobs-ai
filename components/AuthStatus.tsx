"use client";

import { useEffect, useState } from "react";
import { createClient } from "../app/lib/supabase/client";
import AuthModal from "./AuthModal";
import { useLanguage } from "./LanguageProvider";
import { useAuth } from "./useAuth";

type AuthStatusProps = {
  onOpenSpace?: () => void;
  signInRequestId?: number;
};

export default function AuthStatus({ onOpenSpace, signInRequestId = 0 }: AuthStatusProps) {
  const { t } = useLanguage();
  const { user, email, configured, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (signInRequestId > 0 && !user) setOpen(true);
  }, [signInRequestId, user]);

  useEffect(() => {
    if (user) setOpen(false);
  }, [user]);

  async function signOut() {
    setLoading(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
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
          <span className="auth-user" title={email}>
            {email}
          </span>
          <button type="button" onClick={() => void signOut()} disabled={loading || authLoading}>
            {t("auth.signOut")}
          </button>
        </>
      ) : (
        <button type="button" className="auth-sign-in" onClick={() => setOpen(true)} disabled={authLoading}>
          {t("auth.signIn")}
        </button>
      )}
      {message && <small>{message}</small>}
      <AuthModal open={open && !user} onClose={() => setOpen(false)} />
    </div>
  );
}
