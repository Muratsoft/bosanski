"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  api,
  type Flashcard,
  type LeaderboardRow,
  type MatchRound,
  type QuizQuestion,
} from "@/lib/api";

type Tab = "quiz" | "flash" | "match";

export default function GamesPage() {
  const { user, accessToken } = useAuth();
  const [tab, setTab] = useState<Tab>("quiz");
  const [board, setBoard] = useState<LeaderboardRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void api
      .gameLeaderboard()
      .then(setBoard)
      .catch(() => undefined);
  }, []);

  return (
    <>
      <h1 className="section-title">Oyunlar</h1>
      <p className="section-lead">
        Sözlükten üretilen quiz, flashcard ve eşleştirme. Skor kaydı için giriş
        yap.
      </p>

      <div className="game-tabs">
        {(
          [
            ["quiz", "Quiz"],
            ["flash", "Flashcard"],
            ["match", "Eşleştir"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "btn btn--solid" : "btn btn--ghost"}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="error">{error}</div>}

      {tab === "quiz" && (
        <QuizGame
          accessToken={accessToken}
          onError={setError}
          onSaved={() => void api.gameLeaderboard().then(setBoard)}
        />
      )}
      {tab === "flash" && (
        <FlashGame
          accessToken={accessToken}
          onError={setError}
          onSaved={() => void api.gameLeaderboard().then(setBoard)}
        />
      )}
      {tab === "match" && (
        <MatchGame
          accessToken={accessToken}
          onError={setError}
          onSaved={() => void api.gameLeaderboard().then(setBoard)}
        />
      )}

      <section className="panel" style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>
          Skor tablosu
        </h2>
        {!user && (
          <p className="muted">
            Skorunu kaydetmek için <Link href="/giris">giriş yap</Link>.
          </p>
        )}
        {board.map((row) => (
          <div key={row.id} className="list-row">
            <div>
              <strong>{row.user.displayName}</strong>
              <div className="muted">
                {row.gameType} · {row.score}/{row.total} (%{row.percent})
              </div>
            </div>
            <span className="badge">{row.durationSec}s</span>
          </div>
        ))}
        {board.length === 0 && <p className="muted">Henüz skor yok.</p>}
      </section>
    </>
  );
}

function QuizGame({
  accessToken,
  onError,
  onSaved,
}: {
  accessToken: string | null;
  onError: (m: string) => void;
  onSaved: () => void;
}) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  async function start() {
    onError("");
    try {
      const qs = await api.gameQuiz(6);
      setQuestions(qs);
      setIdx(0);
      setScore(0);
      setDone(false);
      setPicked(null);
      setStartedAt(Date.now());
    } catch (err) {
      onError(err instanceof Error ? err.message : "Quiz yüklenemedi");
    }
  }

  useEffect(() => {
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = questions[idx];

  async function choose(choice: string) {
    if (!q || picked) return;
    setPicked(choice);
    const correct = choice === q.answer;
    const nextScore = score + (correct ? 1 : 0);
    if (correct) setScore(nextScore);

    setTimeout(async () => {
      if (idx + 1 >= questions.length) {
        setDone(true);
        if (accessToken) {
          try {
            await api.saveGameScore(accessToken, {
              gameType: "QUIZ",
              score: nextScore,
              total: questions.length,
              durationSec: Math.round((Date.now() - startedAt) / 1000),
            });
            onSaved();
          } catch {
            // ignore
          }
        }
      } else {
        setIdx((i) => i + 1);
        setPicked(null);
      }
    }, 650);
  }

  if (!q && !done) return <p className="muted">Yükleniyor…</p>;

  return (
    <div className="panel stack">
      {done ? (
        <>
          <h2 style={{ fontFamily: "var(--font-display)", margin: 0 }}>
            Quiz bitti
          </h2>
          <p>
            Skor: <strong>{score}/{questions.length}</strong>
          </p>
          <button type="button" className="btn btn--solid" onClick={() => void start()}>
            Tekrar oyna
          </button>
        </>
      ) : (
        <>
          <div className="muted">
            {idx + 1}/{questions.length} · {q.direction}
            {q.hint ? ` · ${q.hint}` : ""}
          </div>
          <h2 className="game-prompt">{q.prompt}</h2>
          <div className="game-choices">
            {q.choices.map((c) => {
              let cls = "btn btn--ghost game-choice";
              if (picked) {
                if (c === q.answer) cls = "btn btn--solid game-choice";
                else if (c === picked) cls = "btn btn--clay game-choice is-wrong";
              }
              return (
                <button
                  key={c}
                  type="button"
                  className={cls}
                  onClick={() => void choose(c)}
                  disabled={Boolean(picked)}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function FlashGame({
  accessToken,
  onError,
  onSaved,
}: {
  accessToken: string | null;
  onError: (m: string) => void;
  onSaved: () => void;
}) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [done, setDone] = useState(false);

  async function start() {
    onError("");
    try {
      const list = await api.gameFlashcards(8);
      setCards(list);
      setIdx(0);
      setFlipped(false);
      setKnown(0);
      setDone(false);
      setStartedAt(Date.now());
    } catch (err) {
      onError(err instanceof Error ? err.message : "Kartlar yüklenemedi");
    }
  }

  useEffect(() => {
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const card = cards[idx];

  async function mark(ok: boolean) {
    const nextKnown = known + (ok ? 1 : 0);
    if (ok) setKnown(nextKnown);
    if (idx + 1 >= cards.length) {
      setDone(true);
      if (accessToken) {
        try {
          await api.saveGameScore(accessToken, {
            gameType: "FLASHCARD",
            score: nextKnown,
            total: cards.length,
            durationSec: Math.round((Date.now() - startedAt) / 1000),
          });
          onSaved();
        } catch {
          // ignore
        }
      }
      return;
    }
    setIdx((i) => i + 1);
    setFlipped(false);
  }

  if (!card && !done) return <p className="muted">Yükleniyor…</p>;

  return (
    <div className="panel stack">
      {done ? (
        <>
          <h2 style={{ fontFamily: "var(--font-display)", margin: 0 }}>
            Flashcard bitti
          </h2>
          <p>
            Bildin: <strong>{known}/{cards.length}</strong>
          </p>
          <button type="button" className="btn btn--solid" onClick={() => void start()}>
            Tekrar
          </button>
        </>
      ) : (
        <>
          <div className="muted">
            {idx + 1}/{cards.length} · {card.variant}
          </div>
          <button
            type="button"
            className={`flash-card ${flipped ? "is-flipped" : ""}`}
            onClick={() => setFlipped((f) => !f)}
          >
            <span>{flipped ? card.back : card.front}</span>
            <small className="muted">
              {flipped
                ? card.exampleTarget || "Tıkla: çevir"
                : card.exampleTr || "Tıkla: çevir"}
            </small>
          </button>
          <div className="game-choices">
            <button type="button" className="btn btn--ghost" onClick={() => void mark(false)}>
              Tekrar
            </button>
            <button type="button" className="btn btn--solid" onClick={() => void mark(true)}>
              Bildim
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MatchGame({
  accessToken,
  onError,
  onSaved,
}: {
  accessToken: string | null;
  onError: (m: string) => void;
  onSaved: () => void;
}) {
  const [round, setRound] = useState<MatchRound | null>(null);
  const [leftSel, setLeftSel] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [done, setDone] = useState(false);

  async function start() {
    onError("");
    try {
      const data = await api.gameMatch(5);
      setRound(data);
      setLeftSel(null);
      setMatched([]);
      setScore(0);
      setDone(false);
      setStartedAt(Date.now());
    } catch (err) {
      onError(err instanceof Error ? err.message : "Eşleştirme yüklenemedi");
    }
  }

  useEffect(() => {
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = round?.pairs.length ?? 0;
  const remainingLeft = useMemo(
    () => (round?.left || []).filter((x) => !matched.includes(x.id)),
    [round, matched],
  );
  const remainingRight = useMemo(
    () => (round?.right || []).filter((x) => !matched.includes(x.id)),
    [round, matched],
  );

  async function pickRight(id: string) {
    if (!leftSel || matched.includes(id)) return;
    const ok = leftSel === id;
    if (ok) {
      const nextMatched = [...matched, id];
      const nextScore = score + 1;
      setMatched(nextMatched);
      setScore(nextScore);
      setLeftSel(null);
      if (nextMatched.length >= total) {
        setDone(true);
        if (accessToken) {
          try {
            await api.saveGameScore(accessToken, {
              gameType: "MATCH",
              score: nextScore,
              total,
              durationSec: Math.round((Date.now() - startedAt) / 1000),
            });
            onSaved();
          } catch {
            // ignore
          }
        }
      }
    } else {
      setLeftSel(null);
    }
  }

  if (!round && !done) return <p className="muted">Yükleniyor…</p>;

  return (
    <div className="panel stack">
      {done ? (
        <>
          <h2 style={{ fontFamily: "var(--font-display)", margin: 0 }}>
            Eşleştirme bitti
          </h2>
          <p>
            Skor: <strong>{score}/{total}</strong>
          </p>
          <button type="button" className="btn btn--solid" onClick={() => void start()}>
            Tekrar
          </button>
        </>
      ) : (
        <>
          <div className="muted">
            Eşleşen: {matched.length}/{total} · önce Türkçe, sonra BCS seç
          </div>
          <div className="match-grid">
            <div className="stack">
              {remainingLeft.map((item) => (
                <button
                  key={`l-${item.id}`}
                  type="button"
                  className={
                    leftSel === item.id
                      ? "btn btn--solid"
                      : "btn btn--ghost"
                  }
                  onClick={() => setLeftSel(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="stack">
              {remainingRight.map((item) => (
                <button
                  key={`r-${item.id}`}
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => void pickRight(item.id)}
                  disabled={!leftSel}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
