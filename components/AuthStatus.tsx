"use client";

import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "../app/lib/supabase/client";

export default function AuthStatus() {
  const [email, setEmail] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) return;

    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, [configured]);

  async function signIn() {
    if (!email.trim()) {
      setMessage("Enter your email first.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setMessage("Check your email for the sign-in link.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send sign-in link.");
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
      setEmail("");
      setUserEmail(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sign out.");
    } finally {
      setLoading(false);
    }
  }

  if (!configured) return null;

  return (
    <div className="auth-status">
      {userEmail ? (
        <>
          <span className="auth-user">{userEmail}</span>
          <button type="button" onClick={() => void signOut()} disabled={loading}>
            Sign out
          </button>
        </>
      ) : (
        <>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email to save matches"
            aria-label="Email to save matches"
          />
          <button type="button" onClick={() => void signIn()} disabled={loading}>
            {loading ? "Sending…" : "Sign in"}
          </button>
        </>
      )}
      {message && <small>{message}</small>}
    </div>
  );
}
