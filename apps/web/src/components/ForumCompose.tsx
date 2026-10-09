"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export function ForumCompose() {
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user || !accessToken) {
    return (
      <div className="panel forum-compose-gate">
        <p>
          Başlık açmak veya entry yazmak için{" "}
          <Link href="/giris">giriş yap</Link> / <Link href="/kayit">üye ol</Link>.
        </p>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const topic = await api.createForumTopic(accessToken!, { title, body });
      setTitle("");
      setBody("");
      router.push(`/baslik/${topic.slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gönderilemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel stack forum-compose" onSubmit={onSubmit}>
      <h2 className="forum-compose__title">Yeni başlık</h2>
      <div className="field">
        <label htmlFor="forum-title">Başlık</label>
        <input
          id="forum-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          minLength={3}
          maxLength={120}
          required
          placeholder="ör. Boşnakça selamlaşma ipuçları"
        />
      </div>
      <div className="field">
        <label htmlFor="forum-body">İlk entry</label>
        <textarea
          id="forum-body"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          minLength={5}
          maxLength={4000}
          required
          placeholder="Düşünceni yaz…"
        />
      </div>
      {error && <div className="error">{error}</div>}
      <button className="btn btn--solid" type="submit" disabled={busy}>
        {busy ? "Gönderiliyor…" : "Başlık aç"}
      </button>
    </form>
  );
}
