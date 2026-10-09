"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, type ClassGroupDetail } from "@/lib/api";

const TYPE_LABEL: Record<string, string> = {
  NOTE: "Ders notu",
  VIDEO: "Canlı / video",
  RECORDING: "Ders kaydı",
  LINK: "Link",
  FILE: "Dosya",
};

export default function GroupDetailPage() {
  const params = useParams<{ slug: string }>();
  const { accessToken, isStaff } = useAuth();
  const [group, setGroup] = useState<ClassGroupDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.slug) return;
    setLoading(true);
    void api
      .group(params.slug, accessToken)
      .then(setGroup)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Grup yüklenemedi"),
      )
      .finally(() => setLoading(false));
  }, [params.slug, accessToken]);

  if (loading) return <p className="muted">Yükleniyor…</p>;
  if (error) return <div className="error">{error}</div>;
  if (!group) return null;

  return (
    <>
      <p className="muted">
        <Link href="/gruplar">← Gruplar</Link>
      </p>
      <h1 className="section-title">{group.name}</h1>
      <p className="section-lead">
        {[group.periodLabel, group.level, group.teacher?.displayName]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {group.description && <p className="muted">{group.description}</p>}

      {group.locked && (
        <div className="panel" style={{ marginBottom: "1rem" }}>
          <p style={{ margin: 0 }}>
            Bu grubun ders notları ve kayıt linkleri sadece üyelere açık.{" "}
            {!accessToken ? (
              <>
                <Link href="/giris">Giriş yap</Link> veya öğretmeninden gruba
                eklenmeni iste.
              </>
            ) : (
              "Öğretmeninden bu gruba eklenmeni iste."
            )}
          </p>
        </div>
      )}

      <section className="panel">
        <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>
          Materyaller
        </h2>
        {group.materials.map((m) => (
          <div key={m.id} className="list-row">
            <div>
              <strong>{m.title}</strong>
              <div className="muted">{TYPE_LABEL[m.type] || m.type}</div>
              {m.body && (
                <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                  {m.body}
                </div>
              )}
              {m.url && (
                <div style={{ marginTop: 6 }}>
                  <a href={m.url} target="_blank" rel="noreferrer">
                    Linki aç →
                  </a>
                </div>
              )}
            </div>
            <span className="badge">{TYPE_LABEL[m.type] || m.type}</span>
          </div>
        ))}
        {group.materials.length === 0 && (
          <p className="muted">Henüz materyal yok.</p>
        )}
      </section>

      {group.canManage && group.members && (
        <section className="panel" style={{ marginTop: "1rem" }}>
          <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>
            Üyeler ({group.members.length})
          </h2>
          {group.members.map((m) => (
            <div key={m.id} className="list-row">
              <div>
                <strong>{m.user.displayName}</strong>
                <div className="muted">{m.user.email}</div>
              </div>
            </div>
          ))}
          {isStaff && (
            <p className="muted">
              Üye / materyal eklemek için <Link href="/admin">Admin</Link>.
            </p>
          )}
        </section>
      )}
    </>
  );
}
