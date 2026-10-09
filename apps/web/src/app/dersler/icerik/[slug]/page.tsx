import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { AiChatPanel } from "@/components/AiChatPanel";

export default async function LessonDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let lesson: Awaited<ReturnType<typeof api.lesson>> | null = null;
  try {
    lesson = await api.lesson(slug);
  } catch {
    notFound();
  }

  return (
    <>
      <p className="muted">
        <Link href="/dersler">← Dersler</Link>
        {lesson.category && (
          <>
            {" · "}
            <Link href={`/dersler/kategori/${lesson.category.slug}`}>
              {lesson.category.title}
            </Link>
          </>
        )}
      </p>
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          marginBottom: "0.5rem",
        }}
      >
        <span className="badge">{lesson.level}</span>
      </div>
      <h1 className="section-title">{lesson.title}</h1>
      {lesson.summary && <p className="section-lead">{lesson.summary}</p>}

      {lesson.videoUrl && (
        <div className="panel" style={{ marginBottom: "1rem" }}>
          <a
            href={lesson.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn--clay"
          >
            Videoyu aç
          </a>
        </div>
      )}

      <div className="lesson-layout">
        <article className="panel prose">{lesson.content}</article>
        <AiChatPanel
          mode="LESSON"
          lessonId={lesson.id}
          lessonContext={[lesson.title, lesson.summary, lesson.content]
            .filter(Boolean)
            .join("\n\n")}
          defaultLevel={lesson.level || "A1"}
          compact
        />
      </div>
    </>
  );
}
