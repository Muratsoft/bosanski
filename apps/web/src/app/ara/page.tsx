"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  api,
  type DictionaryEntry,
  type ForumTopic,
  type Lesson,
} from "@/lib/api";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [dict, setDict] = useState<DictionaryEntry[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [forum, setForum] = useState<ForumTopic[]>([]);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSearched(true);
    try {
      const data = await api.search(q);
      setDict(data.dictionary.items);
      setLessons(data.lessons.items);
      setForum(data.forum?.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Arama başarısız");
    }
  }

  return (
    <>
      <h1 className="section-title">Genel arama</h1>
      <p className="section-lead">Sözlük, ders ve forum başlıklarında ara.</p>

      <form className="panel stack" onSubmit={onSubmit} style={{ marginBottom: "1.25rem" }}>
        <div className="field">
          <label htmlFor="q">Ne arıyorsun?</label>
          <input
            id="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="selam, kahve, boşnakça…"
            required
          />
        </div>
        <button className="btn btn--solid" type="submit">
          Ara
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {searched && (
        <div className="stack" style={{ gap: "1rem" }}>
          <div className="grid-2">
            <div className="panel">
              <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Sözlük</h2>
              {dict.map((w) => (
                <div key={w.id} className="list-row">
                  <strong>
                    {w.wordTr} → {w.wordTarget}
                  </strong>
                </div>
              ))}
              {dict.length === 0 && <p className="muted">Sonuç yok</p>}
            </div>
            <div className="panel">
              <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Dersler</h2>
              {lessons.map((l) => (
                <Link key={l.id} href={`/dersler/icerik/${l.slug}`} className="list-row">
                  <strong>{l.title}</strong>
                </Link>
              ))}
              {lessons.length === 0 && <p className="muted">Sonuç yok</p>}
            </div>
          </div>
          <div className="panel">
            <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Forum</h2>
            {forum.map((t) => (
              <Link key={t.id} href={`/baslik/${t.slug}`} className="list-row">
                <strong>{t.title}</strong>
              </Link>
            ))}
            {forum.length === 0 && <p className="muted">Sonuç yok</p>}
          </div>
        </div>
      )}
    </>
  );
}
