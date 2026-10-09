"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type DictionaryEntry } from "@/lib/api";
import { variantLabel } from "@/lib/labels";

export default function DictionaryPage() {
  return (
    <Suspense fallback={<p className="muted">Yükleniyor…</p>}>
      <DictionaryInner />
    </Suspense>
  );
}

function DictionaryInner() {
  const params = useSearchParams();
  const initialQ = params.get("q") || "";
  const [q, setQ] = useState(initialQ);
  const [variant, setVariant] = useState("COMMON");
  const [items, setItems] = useState<DictionaryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiSource, setAiSource] = useState<"ai" | "dictionary" | "">("");

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
    void load(initialQ);
  }, [initialQ]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setAiText("");
    setAiSource("");
    await load(q);
  }

  async function askAi() {
    if (!q.trim()) {
      setError("Önce bir kelime veya ifade yaz");
      return;
    }
    setAiBusy(true);
    setError("");
    try {
      const res = await api.dictionaryAiExplain(q.trim(), variant);
      setAiText(res.explanation);
      setAiSource(res.source);
      if (res.matches.length) {
        setItems(res.matches);
        setTotal(res.matches.length);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "YZ açıklaması alınamadı");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <>
      <h1 className="section-title">Sözlük</h1>
      <p className="section-lead">
        Türkçe ↔ Boşnakça / Sırpça / Hırvatça / Karadağça. Kelimeyi ara; bulamazsan
        yapay zekadan açıklama iste.
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
        <div className="field">
          <label htmlFor="variant">Dil / varyant</label>
          <select
            id="variant"
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
          >
            <option value="COMMON">
              Ortak (Boşnakça / Sırpça / Hırvatça / Karadağça)
            </option>
            <option value="BS">Boşnakça</option>
            <option value="HR">Hırvatça</option>
            <option value="SR">Sırpça</option>
            <option value="CNR">Karadağça</option>
          </select>
        </div>
        <div className="game-choices">
          <button className="btn btn--ghost" type="submit">
            Sözlükte ara
          </button>
          <button
            className="btn btn--solid"
            type="button"
            disabled={aiBusy}
            onClick={() => void askAi()}
          >
            {aiBusy ? "YZ bakıyor…" : "YZ ile açıkla"}
          </button>
        </div>
      </form>

      {error && <div className="error">{error}</div>}

      {aiText && (
        <div className="panel stack" style={{ marginBottom: "1.25rem" }}>
          <div className="muted">
            <span className="badge">
              {aiSource === "ai" ? "Gemini" : "Yerel"}
            </span>{" "}
            Yapay zeka açıklaması
          </div>
          <div className="ai-messages">
            <div className="ai-msg ai-msg--assistant">{aiText}</div>
          </div>
        </div>
      )}

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
              <span className="badge">{variantLabel(w.variant)}</span>
            </div>
          ))}
          {items.length === 0 && (
            <p className="muted">
              Sonuç yok. Yukarıdan “YZ ile açıkla”ya basabilirsin.
            </p>
          )}
        </div>
      )}
    </>
  );
}
