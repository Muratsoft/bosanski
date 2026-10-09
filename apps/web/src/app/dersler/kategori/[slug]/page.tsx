import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let category: Awaited<ReturnType<typeof api.category>> | null = null;
  try {
    category = await api.category(slug);
  } catch {
    notFound();
  }

  return (
    <>
      <p className="muted">
        <Link href="/dersler">← Dersler</Link>
      </p>
      <h1 className="section-title">{category.title}</h1>
      <p className="section-lead">{category.description}</p>
      <div className="panel">
        {(category.lessons || []).map((l) => (
          <Link key={l.id} href={`/dersler/icerik/${l.slug}`} className="list-row">
            <div>
              <strong>{l.title}</strong>
              <div className="muted">{l.summary}</div>
            </div>
            <span className="badge">{l.level}</span>
          </Link>
        ))}
        {(category.lessons || []).length === 0 && (
          <p className="muted">Bu kategoride henüz ders yok.</p>
        )}
      </div>
    </>
  );
}
