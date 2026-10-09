"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, type MemberDashboard } from "@/lib/api";
import { StudentOnly } from "@/components/StudentOnly";

export default function ProfilePage() {
  const { accessToken } = useAuth();
  const [dash, setDash] = useState<MemberDashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accessToken) return;
    void api
      .meDashboard(accessToken)
      .then(setDash)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Profil yüklenemedi"),
      );
  }, [accessToken]);

  return (
    <StudentOnly>
      <ProfileInner dash={dash} error={error} />
    </StudentOnly>
  );
}

function ProfileInner({
  dash,
  error,
}: {
  dash: MemberDashboard | null;
  error: string;
}) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <>
      <h1 className="section-title">Profilim</h1>
      <p className="section-lead">
        {user.displayName} · {user.email} · {user.status}
      </p>
      {error && <div className="error">{error}</div>}

      <div className="admin-grid">
        <section className="panel stack">
          <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>
            Üyelik
          </h2>
          {dash?.subscription ? (
            <>
              <p>
                <strong>{dash.subscription.plan.name}</strong> ·{" "}
                {dash.subscription.status}
              </p>
              {dash.subscription.endsAt && (
                <p className="muted">
                  Bitiş:{" "}
                  {new Date(dash.subscription.endsAt).toLocaleDateString("tr-TR")}
                </p>
              )}
            </>
          ) : (
            <p className="muted">
              Aktif paket yok.{" "}
              <Link href="/paketler">Paketlere bak</Link>
            </p>
          )}
          {dash?.upcomingPayment && (
            <div className="badge">
              Yaklaşan ödeme: {(dash.upcomingPayment.amountTry / 100).toFixed(0)}{" "}
              TL · {dash.upcomingPayment.status}
            </div>
          )}
        </section>

        <section className="panel stack">
          <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>
            Grubum
          </h2>
          {dash?.groups?.length ? (
            dash.groups.map((g) => (
              <Link key={g.id} href={`/gruplar/${g.slug}`} className="list-row">
                <div>
                  <strong>{g.name}</strong>
                  <div className="muted">{g.periodLabel || g.level}</div>
                </div>
                <span className="badge">Aç</span>
              </Link>
            ))
          ) : (
            <p className="muted">Henüz gruba eklenmedin.</p>
          )}
        </section>

        <section className="panel stack">
          <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>
            İstatistik
          </h2>
          <p>
            Katıldığın ders: <strong>{dash?.lessonsAttended ?? 0}</strong>
          </p>
          <p>
            Tamamlanan kurs:{" "}
            <strong>{dash?.completedCourses?.length ?? 0}</strong>
          </p>
          {dash?.completedCourses?.map((c) => (
            <div key={c.id} className="muted">
              ✓ {c.name}
            </div>
          ))}
        </section>

        <section className="panel stack">
          <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>
            Bekleyen ödevler
          </h2>
          {dash?.pendingHomeworks?.length ? (
            dash.pendingHomeworks.map((h) => (
              <div key={h.id} className="list-row">
                <div>
                  <strong>{h.title}</strong>
                  <div className="muted">{h.group?.name}</div>
                </div>
                {h.group?.slug && (
                  <Link href={`/gruplar/${h.group.slug}`}>Git</Link>
                )}
              </div>
            ))
          ) : (
            <p className="muted">Bekleyen ödev yok.</p>
          )}
          <Link className="btn btn--solid" href="/kendini-sina">
            Kendini sına
          </Link>
        </section>
      </div>
    </>
  );
}

