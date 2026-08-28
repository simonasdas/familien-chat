"use client";

import { useEffect, useState } from "react";
import type { User } from "@/lib/types";
import { RegistrationForm } from "@/components/registration-form";
import { FamilyChat } from "@/components/family-chat";

const loadingStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  minHeight: "100dvh", background: "#12162B", color: "#EDEFFA",
  fontFamily: "'Inter', system-ui, sans-serif", position: "relative",
};
const spinnerStyle: React.CSSProperties = {
  width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(94,234,212,.15)",
  borderTopColor: "#5EEAD4", animation: "spin .7s linear infinite",
};

export function AppShell() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    fetch("/api/user", { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          if (!cancelled) setUser(null);
          return;
        }
        const data = await res.json();
        if (!cancelled && data.user) {
          setUser(data.user as User);
        }
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        clearTimeout(timer);
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; controller.abort(); };
  }, []);

  if (loading) {
    return (
      <div style={loadingStyle}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={spinnerStyle} />
        <p style={{ marginTop: 16, fontSize: 13, color: "rgba(255,255,255,.3)" }}>Wird geladen…</p>
      </div>
    );
  }

  if (!user) {
    return <RegistrationForm onRegistered={(u) => setUser(u)} />;
  }

  return <FamilyChat user={user} />;
}
