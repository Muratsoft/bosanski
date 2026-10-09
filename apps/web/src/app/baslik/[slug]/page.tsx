import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { TopicEntryForm } from "./TopicEntryForm";
import { TopicEntries } from "./TopicEntries";

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let topic: Awaited<ReturnType<typeof api.forumTopic>> | null = null;
  try {
    topic = await api.forumTopic(slug);
  } catch {
    notFound();
  }

  return (
    <>
      <p className="muted">
        <Link href="/">← Gündem</Link>
      </p>
      <h1 className="section-title forum-heading">{topic.title}</h1>
      <p className="section-lead">
        {topic.author?.displayName} · {topic.entryCount} entry
      </p>

      <TopicEntries initial={topic.entries || []} />
      <div style={{ marginTop: "1.25rem" }}>
        <TopicEntryForm slug={topic.slug} />
      </div>
    </>
  );
}
