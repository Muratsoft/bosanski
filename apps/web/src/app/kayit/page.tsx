"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { SocialAuth } from "@/components/SocialAuth";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register(email, password, displayName, referralCode || undefined);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel" style={{ maxWidth: 460, margin: "2rem auto" }}>
      <h1 className="section-title">Üye ol</h1>
      <p className="section-lead">
        Kayıt sonrası hesabın onay bekler; ders yazma ve AI için aktivasyon
        gerekir.
      </p>
      <form className="stack" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="name">Ad</label>
          <input
            id="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            minLength={2}
          />
        </div>
        <div className="field">
          <label htmlFor="email">E-posta</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Şifre</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <div className="field">
          <label htmlFor="ref">Davet kodu (opsiyonel)</label>
          <input
            id="ref"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
          />
        </div>
        {error && <div className="error">{error}</div>}
        <button className="btn btn--solid" type="submit" disabled={busy}>
          {busy ? "Kaydediliyor…" : "Kayıt ol"}
        </button>
      </form>
      <SocialAuth />
      <p className="muted" style={{ marginTop: "1rem" }}>
        Zaten üye misin? <Link href="/giris">Giriş yap</Link>
      </p>
    </div>
  );
}
