"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, type ClassGroupSummary } from "@/lib/api";

export default function GroupsPage() {
  const { user, accessToken, isStaff } = useAuth();
  const [items, setItems] = useState<ClassGroupSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const load = accessToken
      ? api.myGroups(accessToken)
      : api.groups();
    void load
      .then(setItems)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Gruplar yüklenemedi"),
      )
      .finally(() => setLoading(false));
  }, [accessToken]);

  return (
    <>
      <h1 className="section-title">Sınıf grupları</h1>
      <p className="section-lead">
        Ekim grubu, Eylül grubu gibi dönem sınıfları. İçinde ders notları, canlı
        ders ve kayıt linkleri bulunur. Materyalleri görmek için gruba üye
        olman / giriş yapman gerekir.
      </p>

      {isStaff && (
        <p className="muted" style={{ marginBottom: "1rem" }}>
          Öğretmen/admin grup ve materyal eklemek için{" "}
          <Link href="/admin">Admin</Link> paneline gitsin.
        </p>
      )}

      {error && <div className="error">{error}</div>}
      {loading ? (
        <p className="muted">Yükleniyor…</p>
      ) : (
        <div className="panel">
          {items.map((g) => (
            <Link key={g.id} href={`/gruplar/${g.slug}`} className="list-row">
              <div>
                <strong>{g.name}</strong>
                <div className="muted">
                  {[g.periodLabel, g.level, g.teacher?.displayName]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                {g.description && (
                  <div className="muted" style={{ marginTop: 4 }}>
                    {g.description}
                  </div>
                )}
              </div>
              <span className="badge">
                {g._count?.materials ?? 0} materyal
              </span>
            </Link>
          ))}
          {items.length === 0 && (
            <p className="muted">
              {user
                ? "Henüz grubun yok. Admin seni bir gruba ekleyebilir."
                : "Grupları görmek için giriş yap veya yayındaki listeyi bekle."}
            </p>
          )}
        </div>
      )}
    </>
  );
}
