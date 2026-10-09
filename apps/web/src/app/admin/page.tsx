"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  api,
  type Category,
  type ClassGroupSummary,
  type PendingPayment,
  type SafeUser,
} from "@/lib/api";

type ReportItem = Awaited<ReturnType<typeof api.forumReports>>[number];

export default function AdminPage() {
  const { user, accessToken, isStaff, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<{
    total: number;
    pending: number;
    active: number;
    suspended: number;
  } | null>(null);
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [pendingPays, setPendingPays] = useState<PendingPayment[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [wordTr, setWordTr] = useState("");
  const [wordTarget, setWordTarget] = useState("");
  const [catTitle, setCatTitle] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonSlug, setLessonSlug] = useState("");
  const [lessonCategoryId, setLessonCategoryId] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [liveTitle, setLiveTitle] = useState("");
  const [liveStart, setLiveStart] = useState("");
  const [liveEnd, setLiveEnd] = useState("");
  const [liveMeet, setLiveMeet] = useState("https://meet.google.com/");
  const [liveDesc, setLiveDesc] = useState("");
  const [groups, setGroups] = useState<ClassGroupSummary[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupPeriod, setGroupPeriod] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [matType, setMatType] = useState<
    "NOTE" | "VIDEO" | "RECORDING" | "LINK"
  >("NOTE");
  const [matTitle, setMatTitle] = useState("");
  const [matBody, setMatBody] = useState("");
  const [matUrl, setMatUrl] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [hwTitle, setHwTitle] = useState("");
  const [hwDesc, setHwDesc] = useState("");
  const [hwUrl, setHwUrl] = useState("");
  const [hwDue, setHwDue] = useState("");
  const [selfTests, setSelfTests] = useState<
    {
      id: string;
      score: number;
      total: number;
      summary: string;
      student: { displayName: string; email: string };
    }[]
  >([]);

  useEffect(() => {
    if (!loading && (!user || !isStaff)) {
      router.replace("/giris");
    }
  }, [loading, user, isStaff, router]);

  async function refresh() {
    if (!accessToken) return;
    const [dash, userList, cats, reportList, pays, groupList, selfTestsList] =
      await Promise.all([
        api.adminDashboard(accessToken),
        api.adminUsers(accessToken),
        api.adminCategories(accessToken),
        api.forumReports(accessToken).catch(() => [] as ReportItem[]),
        user?.role === "SUPER_ADMIN"
          ? api.pendingPayments(accessToken).catch(() => [] as PendingPayment[])
          : Promise.resolve([] as PendingPayment[]),
        api.myGroups(accessToken).catch(() => [] as ClassGroupSummary[]),
        api.selfTestInbox(accessToken).catch(() => []),
      ]);
    setStats(dash.users);
    setUsers(userList.items);
    setCategories(cats);
    setReports(reportList);
    setPendingPays(pays);
    setGroups(groupList);
    setSelfTests(selfTestsList);
    if (!lessonCategoryId && cats[0]) {
      setLessonCategoryId(cats[0].id);
    }
    if (!selectedGroupId && groupList[0]) {
      setSelectedGroupId(groupList[0].id);
    }
  }

  useEffect(() => {
    if (accessToken && isStaff) {
      void refresh().catch((err) =>
        setError(err instanceof Error ? err.message : "Admin veri alınamadı"),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, isStaff]);

  async function activateUser(id: string) {
    if (!accessToken) return;
    await api.updateUserStatus(accessToken, id, "ACTIVE");
    setMessage("Kullanıcı ACTIVE yapıldı");
    await refresh();
  }

  async function resolveReport(id: string) {
    if (!accessToken) return;
    await api.resolveForumReport(accessToken, id);
    setMessage("Şikayet çözüldü");
    await refresh();
  }

  async function hideReportedEntry(entryId: string, reportId: string) {
    if (!accessToken) return;
    await api.hideForumEntry(accessToken, entryId);
    await api.resolveForumReport(accessToken, reportId);
    setMessage("Entry gizlendi");
    await refresh();
  }

  async function addWord(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    await api.createDictionary(accessToken, { wordTr, wordTarget });
    setWordTr("");
    setWordTarget("");
    setMessage("Sözlük kaydı eklendi");
  }

  async function addCategory(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    await api.createCategory(accessToken, {
      title: catTitle,
      slug: catSlug,
    });
    setCatTitle("");
    setCatSlug("");
    setMessage("Kategori eklendi");
    await refresh();
  }

  async function addLesson(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    await api.createLesson(accessToken, {
      title: lessonTitle,
      slug: lessonSlug,
      categoryId: lessonCategoryId,
      content: lessonContent,
      published: true,
      level: "A1",
    });
    setLessonTitle("");
    setLessonSlug("");
    setLessonContent("");
    setMessage("Ders yayınlandı");
  }

  async function addLiveEvent(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    await api.createCalendarEvent(accessToken, {
      title: liveTitle,
      description: liveDesc || undefined,
      startAt: new Date(liveStart).toISOString(),
      endAt: new Date(liveEnd).toISOString(),
      meetUrl: liveMeet || undefined,
      level: "A1",
      published: true,
    });
    setLiveTitle("");
    setLiveDesc("");
    setLiveStart("");
    setLiveEnd("");
    setMessage("Canlı ders takvime eklendi");
  }

  async function triggerReminders() {
    if (!accessToken || user?.role !== "SUPER_ADMIN") return;
    const res = await api.runReminders(accessToken);
    setMessage(`Ders hatırlatması: ${res.sent} mail`);
  }

  async function reviewPay(
    id: string,
    decision: "APPROVED" | "REJECTED",
  ) {
    if (!accessToken) return;
    await api.reviewPayment(accessToken, id, {
      decision,
      rejectReason: decision === "REJECTED" ? "Eksik dekont" : undefined,
    });
    setMessage(decision === "APPROVED" ? "Ödeme onaylandı" : "Ödeme reddedildi");
    await refresh();
  }

  async function triggerPaymentReminders() {
    if (!accessToken || user?.role !== "SUPER_ADMIN") return;
    const res = await api.runPaymentReminders(accessToken);
    setMessage(`Ödeme hatırlatması: ${res.sent} mail`);
  }

  if (loading || !isStaff) {
    return <p className="muted">Yükleniyor…</p>;
  }

  return (
    <>
      <h1 className="section-title">Öğretmen paneli</h1>
      <p className="section-lead">
        Grup, ödev, takvim, materyal ve üye yönetimi. Öğrenci sayfaları bu
        hesapta menüde çıkmaz.
      </p>

      {message && (
        <div className="panel" style={{ marginBottom: "1rem", background: "rgba(15,92,87,.08)" }}>
          {message}
        </div>
      )}
      {error && <div className="error">{error}</div>}

      {stats && (
        <div className="stat-row" style={{ marginBottom: "1.5rem" }}>
          <div className="stat">
            <strong>{stats.total}</strong>
            <span className="muted">Toplam üye</span>
          </div>
          <div className="stat">
            <strong>{stats.pending}</strong>
            <span className="muted">Bekleyen</span>
          </div>
          <div className="stat">
            <strong>{stats.active}</strong>
            <span className="muted">Aktif</span>
          </div>
          <div className="stat">
            <strong>{stats.suspended}</strong>
            <span className="muted">Askıda</span>
          </div>
        </div>
      )}

      {user?.role === "SUPER_ADMIN" && (
        <section className="panel" style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>
              Bekleyen ödemeler ({pendingPays.length})
            </h2>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => void triggerPaymentReminders()}
            >
              Ödeme hatırlatmalarını tara
            </button>
          </div>
          {pendingPays.map((p) => (
            <div key={p.id} className="list-row">
              <div>
                <strong>
                  {p.user.displayName} · {p.subscription.plan.name}
                </strong>
                <div className="muted">
                  {(p.amountTry / 100).toLocaleString("tr-TR", {
                    style: "currency",
                    currency: "TRY",
                  })}
                  {p.receiptUrl && (
                    <>
                      {" · "}
                      <a href={p.receiptUrl} target="_blank" rel="noreferrer">
                        dekont
                      </a>
                    </>
                  )}
                </div>
                {p.note && <div className="muted">{p.note}</div>}
              </div>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button
                  type="button"
                  className="btn btn--solid"
                  onClick={() => void reviewPay(p.id, "APPROVED")}
                >
                  Onayla
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => void reviewPay(p.id, "REJECTED")}
                >
                  Reddet
                </button>
              </div>
            </div>
          ))}
          {pendingPays.length === 0 && (
            <p className="muted">Bekleyen ödeme yok.</p>
          )}
        </section>
      )}

      <section className="panel" style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>
          Forum şikayetleri ({reports.length})
        </h2>
        {reports.map((r) => (
          <div key={r.id} className="list-row">
            <div>
              <strong>{r.entry.topic.title}</strong>
              <div className="muted">{r.reason}</div>
              <div className="muted" style={{ marginTop: 4 }}>
                {r.entry.body.slice(0, 120)}
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => void resolveReport(r.id)}
              >
                Kapat
              </button>
              <button
                type="button"
                className="btn btn--clay"
                onClick={() => void hideReportedEntry(r.entry.id, r.id)}
              >
                Gizle
              </button>
            </div>
          </div>
        ))}
        {reports.length === 0 && <p className="muted">Açık şikayet yok.</p>}
      </section>

      <div className="grid-2">
        <section className="panel">
          <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Kullanıcılar</h2>
          {users.map((u) => (
            <div key={u.id} className="list-row">
              <div>
                <strong>{u.displayName}</strong>
                <div className="muted">
                  {u.email} · {u.role} · {u.status}
                </div>
              </div>
              {u.status === "PENDING" && user?.role === "SUPER_ADMIN" && (
                <button
                  type="button"
                  className="btn btn--solid"
                  onClick={() => void activateUser(u.id)}
                >
                  Aktif et
                </button>
              )}
            </div>
          ))}
        </section>

        <section className="panel stack">
          <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Sözlük ekle</h2>
          <form className="stack" onSubmit={addWord}>
            <div className="field">
              <label>Türkçe</label>
              <input value={wordTr} onChange={(e) => setWordTr(e.target.value)} required />
            </div>
            <div className="field">
              <label>Hedef dil</label>
              <input value={wordTarget} onChange={(e) => setWordTarget(e.target.value)} required />
            </div>
            <button className="btn btn--solid" type="submit">
              Kaydet
            </button>
          </form>
        </section>

        <section className="panel stack">
          <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Kategori ekle</h2>
          <form className="stack" onSubmit={addCategory}>
            <div className="field">
              <label>Başlık</label>
              <input value={catTitle} onChange={(e) => setCatTitle(e.target.value)} required />
            </div>
            <div className="field">
              <label>Slug</label>
              <input value={catSlug} onChange={(e) => setCatSlug(e.target.value)} required />
            </div>
            <button className="btn btn--solid" type="submit">
              Kaydet
            </button>
          </form>
        </section>

        <section className="panel stack">
          <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Ders ekle</h2>
          <form className="stack" onSubmit={addLesson}>
            <div className="field">
              <label>Başlık</label>
              <input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} required />
            </div>
            <div className="field">
              <label>Slug</label>
              <input value={lessonSlug} onChange={(e) => setLessonSlug(e.target.value)} required />
            </div>
            <div className="field">
              <label>Kategori</label>
              <select
                value={lessonCategoryId}
                onChange={(e) => setLessonCategoryId(e.target.value)}
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>İçerik</label>
              <textarea
                rows={5}
                value={lessonContent}
                onChange={(e) => setLessonContent(e.target.value)}
              />
            </div>
            <button className="btn btn--clay" type="submit">
              Yayınla
            </button>
          </form>
        </section>

        <section className="panel stack">
          <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>
            Canlı ders (Meet)
          </h2>
          <form className="stack" onSubmit={addLiveEvent}>
            <div className="field">
              <label>Başlık</label>
              <input
                value={liveTitle}
                onChange={(e) => setLiveTitle(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Başlangıç</label>
              <input
                type="datetime-local"
                value={liveStart}
                onChange={(e) => setLiveStart(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Bitiş</label>
              <input
                type="datetime-local"
                value={liveEnd}
                onChange={(e) => setLiveEnd(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Google Meet URL</label>
              <input
                value={liveMeet}
                onChange={(e) => setLiveMeet(e.target.value)}
                placeholder="https://meet.google.com/xxx-yyyy-zzz"
              />
            </div>
            <div className="field">
              <label>Açıklama</label>
              <textarea
                rows={3}
                value={liveDesc}
                onChange={(e) => setLiveDesc(e.target.value)}
              />
            </div>
            <button className="btn btn--solid" type="submit">
              Takvime ekle
            </button>
          </form>
          {user?.role === "SUPER_ADMIN" && (
            <div>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => void triggerReminders()}
              >
                Hatırlatmaları şimdi tara
              </button>
            </div>
          )}
        </section>

        <section className="panel stack">
          <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>
            Sınıf grupları
          </h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Ekim / Eylül gibi dönem grupları; not, Meet ve kayıt linki ekle.
          </p>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (!accessToken) return;
              void api
                .createGroup(accessToken, {
                  name: groupName,
                  periodLabel: groupPeriod || undefined,
                  description: groupDesc || undefined,
                  level: "A1",
                })
                .then(async () => {
                  setMessage("Grup oluşturuldu");
                  setGroupName("");
                  setGroupPeriod("");
                  setGroupDesc("");
                  await refresh();
                })
                .catch((err) =>
                  setError(
                    err instanceof Error ? err.message : "Grup oluşturulamadı",
                  ),
                );
            }}
          >
            <div className="field">
              <label>Grup adı</label>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ekim 2026 Grubu"
                required
              />
            </div>
            <div className="field">
              <label>Dönem</label>
              <input
                value={groupPeriod}
                onChange={(e) => setGroupPeriod(e.target.value)}
                placeholder="Ekim 2026"
              />
            </div>
            <div className="field">
              <label>Açıklama</label>
              <textarea
                rows={2}
                value={groupDesc}
                onChange={(e) => setGroupDesc(e.target.value)}
              />
            </div>
            <button className="btn btn--solid" type="submit">
              Grup oluştur
            </button>
          </form>

          <hr style={{ border: 0, borderTop: "1px solid var(--line)" }} />

          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (!accessToken || !selectedGroupId) return;
              void api
                .addGroupMaterial(accessToken, selectedGroupId, {
                  type: matType,
                  title: matTitle,
                  body: matBody || undefined,
                  url: matUrl || undefined,
                })
                .then(async () => {
                  setMessage("Materyal eklendi");
                  setMatTitle("");
                  setMatBody("");
                  setMatUrl("");
                  await refresh();
                })
                .catch((err) =>
                  setError(
                    err instanceof Error ? err.message : "Materyal eklenemedi",
                  ),
                );
            }}
          >
            <div className="field">
              <label>Grup</label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                required
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Tür</label>
              <select
                value={matType}
                onChange={(e) =>
                  setMatType(
                    e.target.value as "NOTE" | "VIDEO" | "RECORDING" | "LINK",
                  )
                }
              >
                <option value="NOTE">Ders notu</option>
                <option value="VIDEO">Canlı / video linki</option>
                <option value="RECORDING">Ders kaydı</option>
                <option value="LINK">Genel link</option>
              </select>
            </div>
            <div className="field">
              <label>Başlık</label>
              <input
                value={matTitle}
                onChange={(e) => setMatTitle(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Not / açıklama</label>
              <textarea
                rows={3}
                value={matBody}
                onChange={(e) => setMatBody(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Link (Meet / YouTube / Drive)</label>
              <input
                value={matUrl}
                onChange={(e) => setMatUrl(e.target.value)}
                placeholder="https://"
              />
            </div>
            <button className="btn btn--solid" type="submit">
              Materyal ekle
            </button>
          </form>

          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (!accessToken || !selectedGroupId) return;
              void api
                .addGroupMember(accessToken, selectedGroupId, memberEmail)
                .then(async () => {
                  setMessage("Üye eklendi");
                  setMemberEmail("");
                  await refresh();
                })
                .catch((err) =>
                  setError(
                    err instanceof Error ? err.message : "Üye eklenemedi",
                  ),
                );
            }}
          >
            <div className="field">
              <label>Öğrenci e-postası (üyelik)</label>
              <input
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="ogrenci@mail.com"
                required
              />
            </div>
            <button className="btn btn--ghost" type="submit">
              Gruba üye ekle
            </button>
          </form>

          <div>
            {groups.map((g) => (
              <div key={g.id} className="list-row">
                <div>
                  <strong>{g.name}</strong>
                  <div className="muted">
                    {g.periodLabel || "—"} · {g._count?.materials ?? 0} materyal
                    · {g._count?.members ?? 0} üye
                  </div>
                </div>
                <a className="btn btn--ghost" href={`/gruplar/${g.slug}`}>
                  Aç
                </a>
              </div>
            ))}
          </div>

          <hr style={{ border: 0, borderTop: "1px solid var(--line)" }} />
          <h3 style={{ fontFamily: "var(--font-display)", marginBottom: 0 }}>
            Ödev ver
          </h3>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (!accessToken || !selectedGroupId) return;
              void api
                .createHomework(accessToken, {
                  groupId: selectedGroupId,
                  title: hwTitle,
                  description: hwDesc || undefined,
                  attachmentUrl: hwUrl || undefined,
                  attachmentName: hwUrl ? "Ödev dosyası" : undefined,
                  dueAt: hwDue ? new Date(hwDue).toISOString() : undefined,
                })
                .then(async () => {
                  setMessage("Ödev oluşturuldu");
                  setHwTitle("");
                  setHwDesc("");
                  setHwUrl("");
                  setHwDue("");
                  await refresh();
                })
                .catch((err) =>
                  setError(err instanceof Error ? err.message : "Ödev eklenemedi"),
                );
            }}
          >
            <div className="field">
              <label>Grup</label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Ödev başlığı</label>
              <input
                value={hwTitle}
                onChange={(e) => setHwTitle(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Açıklama</label>
              <textarea
                rows={2}
                value={hwDesc}
                onChange={(e) => setHwDesc(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Dosya / Drive linki</label>
              <input
                value={hwUrl}
                onChange={(e) => setHwUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
              />
            </div>
            <div className="field">
              <label>Son tarih</label>
              <input
                type="datetime-local"
                value={hwDue}
                onChange={(e) => setHwDue(e.target.value)}
              />
            </div>
            <button className="btn btn--solid" type="submit">
              Ödev yayınla
            </button>
          </form>

          <h3 style={{ fontFamily: "var(--font-display)" }}>
            Kendini sına sonuçları
          </h3>
          {selfTests.map((t) => (
            <div key={t.id} className="list-row">
              <div>
                <strong>
                  {t.student.displayName} · {t.score}/{t.total}
                </strong>
                <div className="muted">{t.student.email}</div>
                <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>
                  {t.summary.slice(0, 280)}
                  {t.summary.length > 280 ? "…" : ""}
                </div>
              </div>
            </div>
          ))}
          {selfTests.length === 0 && (
            <p className="muted">Henüz test sonucu yok.</p>
          )}
        </section>
      </div>
    </>
  );
}
