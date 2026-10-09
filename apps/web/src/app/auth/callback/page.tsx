"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

function OAuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { completeOAuth } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    if (!accessToken || !refreshToken) {
      setError("Google girişinden token gelmedi");
      return;
    }
    void completeOAuth(accessToken, refreshToken)
      .then(() => router.replace("/"))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "OAuth tamamlanamadı");
      });
  }, [completeOAuth, params, router]);

  if (error) {
    return (
      <div className="panel" style={{ maxWidth: 460, margin: "2rem auto" }}>
        <h1 className="section-title">Giriş başarısız</h1>
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="panel" style={{ maxWidth: 460, margin: "2rem auto" }}>
      <p className="muted">Google ile giriş tamamlanıyor…</p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="panel" style={{ maxWidth: 460, margin: "2rem auto" }}>
          <p className="muted">Yükleniyor…</p>
        </div>
      }
    >
      <OAuthCallbackInner />
    </Suspense>
  );
}
