"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  const { user, accessToken, isStaff } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [mine, setMine] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const list = await api.calendarEvents();
      setEvents(list);
      if (accessToken) {
        const enrolled = await api.myCalendar(accessToken);
        setMine(enrolled.map((e) => e.event.id));
      } else {
        setMine([]);
      }
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
    if (!accessToken) {
      window.location.href = "/giris";
      return;
    }
    try {
      await api.enrollEvent(accessToken, id);
      setMessage("Derse kaydoldun. Hatırlatma maili (24s / 1s) otomatik gidecek.");
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

  return (
    <>
      <h1 className="section-title">Ders takvimi</h1>
      <p className="section-lead">
        Canlı dersler Google Meet ile. Kayıt olanlara 24 saat ve 1 saat kala
        hatırlatma maili gider.
      </p>

      {isStaff && (
        <p className="muted" style={{ marginBottom: "1rem" }}>
          Öğretmen / admin yeni ders eklemek için <Link href="/admin">Admin</Link>{" "}
          panelini kullan.
        </p>
      )}

      {message && (
        <div className="panel" style={{ marginBottom: "1rem", background: "rgba(15,92,87,.08)" }}>
          {message}
        </div>
      )}
      {error && <div className="error">{error}</div>}

      {loading ? (
        <p className="muted">Yükleniyor…</p>
      ) : (
        <div className="calendar-list">
          {events.map((ev) => {
            const isEnrolled = mine.includes(ev.id);
            return (
              <article key={ev.id} className="panel calendar-card">
                <div className="calendar-card__top">
                  <div>
                    <span className="badge">{ev.level || "A1"}</span>
                    <h2 className="calendar-card__title">{ev.title}</h2>
                    <p className="muted" style={{ margin: "0.35rem 0" }}>
                      {formatRange(ev.startAt, ev.endAt)}
                    </p>
                    {ev.teacher && (
                      <p className="muted" style={{ margin: 0 }}>
                        Eğitmen: {ev.teacher.displayName}
                      </p>
                    )}
                  </div>
                  <div className="calendar-card__cap muted">
                    {ev._count?.enrollments ?? 0}/{ev.capacity}
                  </div>
                </div>
                {ev.description && (
                  <p className="calendar-card__desc">{ev.description}</p>
                )}
                <div className="calendar-card__actions">
                  {isEnrolled ? (
                    <>
                      {ev.meetUrl && (
                        <a
                          className="btn btn--clay"
                          href={ev.meetUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Meet’e gir
                        </a>
                      )}
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => void unenroll(ev.id)}
                      >
                        İptal
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--solid"
                      onClick={() => void enroll(ev.id)}
                    >
                      {user ? "Kaydol" : "Giriş yapıp kaydol"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
          {events.length === 0 && (
            <p className="muted">Yaklaşan canlı ders yok.</p>
          )}
        </div>
      )}
    </>
  );
}
