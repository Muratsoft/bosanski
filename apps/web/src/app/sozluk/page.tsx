"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, type DictionaryEntry } from "@/lib/api";

export default function DictionaryPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<DictionaryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(query = "") {
    setLoading(true);
    setError("");
    try {
      const data = await api.dictionary(query || undefined);
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void load(q);
  }

  return (
    <>
      <h1 className="section-title">Sözlük</h1>
      <p className="section-lead">
        Türkçe ↔ BCS. Varyant etiketiyle ortak / BS / HR / SR / CNR farkları.
      </p>

      <form className="panel stack" onSubmit={onSubmit} style={{ marginBottom: "1.25rem" }}>
        <div className="field">
          <label htmlFor="q">Kelime ara</label>
          <input
            id="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ör. merhaba, hvala, voda"
          />
        </div>
        <button className="btn btn--solid" type="submit">
          Ara
        </button>
      </form>

      {error && <div className="error">{error}</div>}
      {loading ? (
        <p className="muted">Yükleniyor…</p>
      ) : (
        <div className="panel">
          <p className="muted" style={{ marginTop: 0 }}>
            {total} kayıt
          </p>
          {items.map((w) => (
            <div key={w.id} className="list-row">
              <div>
                <strong>
                  {w.wordTr} → {w.wordTarget}
                </strong>
                <div className="muted">
                  {[w.partOfSpeech, w.phonetic].filter(Boolean).join(" · ")}
                </div>
                {w.exampleTr && (
                  <div className="muted" style={{ marginTop: 4 }}>
                    {w.exampleTr} / {w.exampleTarget}
                  </div>
                )}
                {w.notes && <div className="muted">{w.notes}</div>}
              </div>
              <span className="badge">{w.variant}</span>
            </div>
          ))}
          {items.length === 0 && <p className="muted">Sonuç yok.</p>}
        </div>
      )}
    </>
  );
}
