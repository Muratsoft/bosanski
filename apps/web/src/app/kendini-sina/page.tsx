"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, type QuizQuestion } from "@/lib/api";

type Q = Omit<QuizQuestion, "answer"> & { answer?: string };

export default function SelfTestPage() {
  const { user, accessToken, loading } = useAuth();
  const router = useRouter();
  const [level, setLevel] = useState("A1");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answerKey, setAnswerKey] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [answers, setAnswers] = useState<
    { id: string; chosen: string; correctAnswer: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    total: number;
    summary: string;
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/giris");
  }, [loading, user, router]);

  async function start() {
    if (!accessToken) return;
    setBusy(true);
    setError("");
    setResult(null);
    setAnswers([]);
    setIdx(0);
    setPicked(null);
    try {
      const res = await api.selfTestStart(accessToken, level);
      setQuestions(res.questions);
      setAnswerKey(
        Object.fromEntries(res.answerKey.map((a) => [a.id, a.answer])),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test başlatılamadı");
    } finally {
      setBusy(false);
    }
  }

  async function choose(choice: string) {
    if (!accessToken || picked) return;
    const q = questions[idx];
    if (!q) return;
    setPicked(choice);
    const correctAnswer = answerKey[q.id] || "";
    const next = [
      ...answers,
      { id: q.id, chosen: choice, correctAnswer },
    ];
    setAnswers(next);

    setTimeout(async () => {
      if (idx + 1 >= questions.length) {
        setBusy(true);
        try {
          const res = await api.selfTestSubmit(accessToken, {
            level,
            answers: next,
          });
          setResult(res);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Gönderilemedi");
        } finally {
          setBusy(false);
        }
      } else {
        setIdx((i) => i + 1);
        setPicked(null);
      }
    }, 500);
  }

  if (loading || !user) return <p className="muted">Yükleniyor…</p>;

  const q = questions[idx];

  return (
    <>
      <h1 className="section-title">Kendini sına</h1>
      <p className="section-lead">
        Kısa yapay zeka testi. Sonuç özeti grubundaki öğretmene iletilir.
      </p>

      {!questions.length && !result && (
        <div className="panel stack">
          <div className="field">
            <label>Seviye</label>
            <select value={level} onChange={(e) => setLevel(e.target.value)}>
              {["A1", "A2", "B1", "B2"].map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn btn--solid"
            disabled={busy}
            onClick={() => void start()}
          >
            {busy ? "Hazırlanıyor…" : "Teste başla"}
          </button>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {q && !result && (
        <div className="panel stack">
          <div className="muted">
            {idx + 1}/{questions.length} · {q.direction}
          </div>
          <h2 className="game-prompt">{q.prompt}</h2>
          <div className="game-choices">
            {q.choices.map((c) => (
              <button
                key={c}
                type="button"
                className={
                  picked === c ? "btn btn--solid" : "btn btn--ghost"
                }
                disabled={Boolean(picked) || busy}
                onClick={() => void choose(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="panel stack">
          <h2 style={{ fontFamily: "var(--font-display)", margin: 0 }}>
            Sonuç: {result.score}/{result.total}
          </h2>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
            {result.summary}
          </pre>
          <p className="muted">Özet öğretmenine gönderildi (grubun varsa).</p>
          <button type="button" className="btn btn--solid" onClick={() => void start()}>
            Tekrar dene
          </button>
          <Link href="/profil">Profile dön</Link>
        </div>
      )}
    </>
  );
}
