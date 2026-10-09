"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  api,
  type ClassGroupDetail,
  type HomeworkItem,
} from "@/lib/api";

const TYPE_LABEL: Record<string, string> = {
  NOTE: "Ders notu",
  VIDEO: "Canlı / video",
  RECORDING: "Ders kaydı",
  LINK: "Link",
  FILE: "Dosya",
};

export default function GroupDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { user, accessToken, isStaff, loading: authLoading } = useAuth();
  const [group, setGroup] = useState<ClassGroupDetail | null>(null);
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/giris");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!params.slug || !accessToken) return;
    setLoading(true);
    void api
      .group(params.slug, accessToken)
      .then(async (g) => {
        setGroup(g);
        if (g.id && (g.isMember || g.canManage)) {
          const hw = await api.groupHomeworks(accessToken, g.id).catch(() => []);
          setHomeworks(hw);
        }
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Grup yüklenemedi"),
      )
      .finally(() => setLoading(false));
  }, [params.slug, accessToken]);

  async function markHomework(id: string) {
    if (!accessToken) return;
    try {
      await api.submitHomework(accessToken, id, { done: true });
      setMessage("Ödev yapıldı olarak işaretlendi");
      if (group?.id) {
        const hw = await api.groupHomeworks(accessToken, group.id);
        setHomeworks(hw);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşaretlenemedi");
    }
  }

  if (authLoading || loading || !user) return <p className="muted">Yükleniyor…</p>;
  if (error) return <div className="error">{error}</div>;
  if (!group) return null;

  return (
    <>
      <p className="muted">
        <Link href="/gruplar">← Grubum</Link>
      </p>
      {message && (
        <div className="panel" style={{ marginBottom: "1rem", background: "rgba(15,92,87,.08)" }}>
          {message}
        </div>
      )}
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

      <section className="panel" style={{ marginTop: "1rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>
          Ödevler
        </h2>
        {homeworks.map((h) => (
          <div key={h.id} className="list-row">
            <div>
              <strong>{h.title}</strong>
              {h.description && <div className="muted">{h.description}</div>}
              {h.attachmentUrl && (
                <div style={{ marginTop: 4 }}>
                  <a href={h.attachmentUrl} target="_blank" rel="noreferrer">
                    {h.attachmentName || "Ödev dosyası / linki"}
                  </a>
                </div>
              )}
              {h.dueAt && (
                <div className="muted">
                  Son tarih: {new Date(h.dueAt).toLocaleString("tr-TR")}
                </div>
              )}
              {h.submissions && h.submissions.length > 0 && (
                <div className="muted" style={{ marginTop: 6 }}>
                  Yapanlar:{" "}
                  {h.submissions.map((s) => s.user.displayName).join(", ")}
                </div>
              )}
            </div>
            {h.mySubmission?.done ? (
              <span className="badge">Yaptım ✓</span>
            ) : (
              <button
                type="button"
                className="btn btn--solid"
                onClick={() => void markHomework(h.id)}
              >
                Yaptım
              </button>
            )}
          </div>
        ))}
        {homeworks.length === 0 && <p className="muted">Ödev yok.</p>}
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
              Üye / ödev / materyal için <Link href="/admin">Admin</Link>.
            </p>
          )}
        </section>
      )}
    </>
  );
}
