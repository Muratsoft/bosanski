"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, type ClassGroupSummary, type HomeworkItem } from "@/lib/api";
import { StudentOnly } from "@/components/StudentOnly";

export default function MyHomeworkPage() {
  return (
    <StudentOnly>
      <MyHomeworkInner />
    </StudentOnly>
  );
}

function MyHomeworkInner() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<
    (HomeworkItem & { groupName?: string; groupSlug?: string })[]
  >([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    void (async () => {
      try {
        const groups = await api.myGroups(accessToken);
        const all: (HomeworkItem & {
          groupName?: string;
          groupSlug?: string;
        })[] = [];
        for (const g of groups as ClassGroupSummary[]) {
          const hw = await api.groupHomeworks(accessToken, g.id).catch(() => []);
          for (const h of hw) {
            all.push({
              ...h,
              groupName: g.name,
              groupSlug: g.slug,
            });
          }
        }
        setItems(all);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ödevler yüklenemedi");
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  async function markDone(id: string) {
    if (!accessToken) return;
    try {
      await api.submitHomework(accessToken, id, { done: true });
      setMessage("Ödev yapıldı olarak işaretlendi");
      setItems((prev) =>
        prev.map((h) =>
          h.id === id
            ? { ...h, mySubmission: { done: true, note: null, fileUrl: null } }
            : h,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşaretlenemedi");
    }
  }

  return (
    <>
      <h1 className="section-title">Ödevlerim</h1>
      <p className="section-lead">
        Gruplarındaki ödevler. Dosya linkini aç, bitince “Yaptım” de.
      </p>
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
          {items.map((h) => (
            <div key={h.id} className="list-row">
              <div>
                <strong>{h.title}</strong>
                <div className="muted">{h.groupName}</div>
                {h.description && <div>{h.description}</div>}
                {h.attachmentUrl && (
                  <div style={{ marginTop: 4 }}>
                    <a href={h.attachmentUrl} target="_blank" rel="noreferrer">
                      {h.attachmentName || "Ödev dosyası"}
                    </a>
                  </div>
                )}
                {h.dueAt && (
                  <div className="muted">
                    Son: {new Date(h.dueAt).toLocaleString("tr-TR")}
                  </div>
                )}
              </div>
              <div className="stack">
                {h.groupSlug && (
                  <Link href={`/gruplar/${h.groupSlug}`} className="btn btn--ghost">
                    Grup
                  </Link>
                )}
                {h.mySubmission?.done ? (
                  <span className="badge">Yaptım ✓</span>
                ) : (
                  <button
                    type="button"
                    className="btn btn--solid"
                    onClick={() => void markDone(h.id)}
                  >
                    Yaptım
                  </button>
                )}
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="muted">Bekleyen ödev yok.</p>}
        </div>
      )}
    </>
  );
}
