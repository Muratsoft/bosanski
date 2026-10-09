"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export function TopicEntryForm({ slug }: { slug: string }) {
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user || !accessToken) {
    return (
      <div className="panel forum-compose-gate">
        Entry yazmak için <Link href="/giris">giriş yapmalısın</Link>.
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.addForumEntry(accessToken!, slug, body);
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gönderilemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel stack" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="entry">Entry</label>
        <textarea
          id="entry"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          minLength={5}
          required
          placeholder="Bu başlığa ekle…"
        />
      </div>
      {error && <div className="error">{error}</div>}
      <button className="btn btn--solid" type="submit" disabled={busy}>
        {busy ? "Gönderiliyor…" : "Entry gönder"}
      </button>
    </form>
  );
}
