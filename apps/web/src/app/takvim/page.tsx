"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, type CalendarEvent } from "@/lib/api";

function formatRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const date = start.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const t1 = start.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const t2 = end.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} · ${t1}–${t2}`;
}

export default function CalendarPage() {
  const { user, accessToken, isStaff, loading: authLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [mine, setMine] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/giris");
  }, [authLoading, user, router]);

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    setError("");
    try {
      const list = await api.calendarEvents(accessToken);
      setEvents(list);
      const enrolled = await api.myCalendar(accessToken);
      setMine(enrolled.map((e) => e.event.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Takvim yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function enroll(id: string) {
    if (!accessToken) return;
    try {
      await api.enrollEvent(accessToken, id);
      setMessage("Derse kaydoldun.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    }
  }

  async function unenroll(id: string) {
    if (!accessToken) return;
    await api.unenrollEvent(accessToken, id);
    setMessage("Kayıt iptal edildi");
    await load();
  }

  if (authLoading || !user) return <p className="muted">Yükleniyor…</p>;

  return (
    <>
      <h1 className="section-title">Ders takvimi</h1>
      <p className="section-lead">
        Senin grupların ve kayıtların. Canlı dersler Google Meet ile.
      </p>

      {isStaff && (
        <p className="muted" style={{ marginBottom: "1rem" }}>
          Yeni ders için <Link href="/admin">Admin</Link>.
        </p>
      )}

      {message && (
        <div
          className="panel"
          style={{ marginBottom: "1rem", background: "rgba(15,92,87,.08)" }}
        >
          {message}
        </div>
      )}
      {error && <div className="error">{error}</div>}

      {loading ? (
        <p className="muted">Yükleniyor…</p>
      ) : (
        <div className="panel">
          {events.map((ev) => {
            const enrolled = mine.includes(ev.id);
            return (
              <div key={ev.id} className="list-row">
                <div>
                  <strong>{ev.title}</strong>
                  <div className="muted">
                    {formatRange(ev.startAt, ev.endAt)}
                    {ev.level ? ` · ${ev.level}` : ""}
                  </div>
                  {ev.description && (
                    <div className="muted" style={{ marginTop: 4 }}>
                      {ev.description}
                    </div>
                  )}
                  {ev.meetUrl && (
                    <div style={{ marginTop: 6 }}>
                      <a href={ev.meetUrl} target="_blank" rel="noreferrer">
                        Meet linki
                      </a>
                    </div>
                  )}
                </div>
                <div className="stack">
                  {enrolled ? (
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => void unenroll(ev.id)}
                    >
                      İptal
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--solid"
                      onClick={() => void enroll(ev.id)}
                    >
                      Kaydol
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {events.length === 0 && (
            <p className="muted">
              Grubuna ait yaklaşan ders yok. Öğretmen takvime ekleyince burada
              görünür.
            </p>
          )}
        </div>
      )}
    </>
  );
}
