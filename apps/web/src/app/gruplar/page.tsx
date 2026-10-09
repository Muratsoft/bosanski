"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, type ClassGroupSummary } from "@/lib/api";

export default function GroupsPage() {
  const { user, accessToken, isStaff, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ClassGroupSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/giris");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    void api
      .myGroups(accessToken)
      .then(setItems)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Gruplar yüklenemedi"),
      )
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (authLoading || !user) return <p className="muted">Yükleniyor…</p>;

  return (
    <>
      <h1 className="section-title">Grubum</h1>
      <p className="section-lead">
        Dönem sınıfların, ders notları ve kayıt linkleri.
      </p>

      {isStaff && (
        <p className="muted" style={{ marginBottom: "1rem" }}>
          Grup / ödev yönetimi: <Link href="/admin">Admin</Link>
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
              </div>
              <span className="badge">
                {g._count?.materials ?? 0} materyal
              </span>
            </Link>
          ))}
          {items.length === 0 && (
            <p className="muted">
              Henüz grubun yok. Öğretmen seni e-posta ile ekleyince burada
              görünür.
            </p>
          )}
        </div>
      )}
    </>
  );
}
