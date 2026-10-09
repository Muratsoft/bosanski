import Link from "next/link";
import { api } from "@/lib/api";

export default async function LessonsPage() {
  let categories: Awaited<ReturnType<typeof api.categories>> = [];
  let lessons: Awaited<ReturnType<typeof api.lessons>> = { total: 0, items: [] };

  try {
    [categories, lessons] = await Promise.all([
      api.categories(),
      api.lessons(),
    ]);
  } catch {
    // ignore
  }

  return (
    <>
      <h1 className="section-title">Dersler</h1>
      <p className="section-lead">
        Kategorilerden seç veya tüm yayınlanmış derslere göz at.
      </p>

      <div className="grid-2" style={{ marginBottom: "2rem" }}>
        {categories.map((c) => (
          <Link key={c.id} href={`/dersler/kategori/${c.slug}`} className="panel stack">
            <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem" }}>
              {c.title}
            </strong>
            <span className="muted">{c.description}</span>
          </Link>
        ))}
      </div>

      <div className="panel">
        {lessons.items.map((l) => (
          <Link key={l.id} href={`/dersler/icerik/${l.slug}`} className="list-row">
            <div>
              <strong>{l.title}</strong>
              <div className="muted">{l.summary}</div>
            </div>
            <span className="badge">{l.level}</span>
          </Link>
        ))}
        {lessons.items.length === 0 && (
          <p className="muted">Henüz ders yok.</p>
        )}
      </div>
    </>
  );
}
