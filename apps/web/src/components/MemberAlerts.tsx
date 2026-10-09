"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, type MemberDashboard } from "@/lib/api";

export function MemberAlerts() {
  const { accessToken, user } = useAuth();
  const [dash, setDash] = useState<MemberDashboard | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setDash(null);
      return;
    }
    void api
      .meDashboard(accessToken)
      .then(setDash)
      .catch(() => undefined);
  }, [accessToken]);

  if (!user || !dash?.alerts) return null;

  const { nextLesson, pendingHomeworkCount, pendingHomeworks } = dash.alerts;
  if (!nextLesson && pendingHomeworkCount === 0) return null;

  return (
    <div className={`member-alerts ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="member-alerts__toggle"
        onClick={() => setOpen((o) => !o)}
      >
        Uyarılar
        {pendingHomeworkCount > 0 ? ` (${pendingHomeworkCount})` : ""}
      </button>
      {open && (
        <div className="member-alerts__panel">
          {nextLesson && (
            <div className="member-alerts__item">
              <strong>Sonraki ders</strong>
              <div>{nextLesson.title}</div>
              <div className="muted">
                {new Date(nextLesson.startAt).toLocaleString("tr-TR")}
                {nextLesson.groupName ? ` · ${nextLesson.groupName}` : ""}
              </div>
              {nextLesson.meetUrl && (
                <a href={nextLesson.meetUrl} target="_blank" rel="noreferrer">
                  Meet linki
                </a>
              )}
            </div>
          )}
          {pendingHomeworks?.map((h) => (
            <div key={h.id} className="member-alerts__item">
              <strong>Bekleyen ödev</strong>
              <div>{h.title}</div>
              <div className="muted">
                {h.groupName}
                {h.dueAt
                  ? ` · son ${new Date(h.dueAt).toLocaleDateString("tr-TR")}`
                  : ""}
              </div>
              <Link href={`/gruplar/${h.groupSlug}`}>Gruba git</Link>
            </div>
          ))}
          <Link href="/profil" className="muted">
            Profile bak →
          </Link>
        </div>
      )}
    </div>
  );
}
