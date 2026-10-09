"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, type ForumEntry, type ForumTopic } from "@/lib/api";
import { useState } from "react";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function TopicList({ topics }: { topics: ForumTopic[] }) {
  return (
    <div className="forum-topics">
      {topics.map((t) => (
        <Link key={t.id} href={`/baslik/${t.slug}`} className="forum-topic-row">
          <span className="forum-topic-row__title">{t.title}</span>
          <span className="forum-topic-row__meta">
            {t.entryCount || t._count?.entries || 0}
          </span>
        </Link>
      ))}
      {topics.length === 0 && (
        <p className="muted">Henüz başlık yok. İlk sen aç.</p>
      )}
    </div>
  );
}

export function EntryCard({
  entry,
  showTopic = false,
  onChanged,
}: {
  entry: ForumEntry;
  showTopic?: boolean;
  onChanged?: (entry: ForumEntry) => void;
}) {
  const { user, accessToken, isStaff } = useAuth();
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState(entry);

  async function vote(value: 1 | -1) {
    if (!accessToken) {
      window.location.href = "/giris";
      return;
    }
    setBusy(true);
    try {
      const updated = await api.voteForumEntry(accessToken, local.id, value);
      setLocal({ ...local, ...updated });
      onChanged?.(updated);
    } finally {
      setBusy(false);
    }
  }

  async function report() {
    if (!accessToken) return;
    const reason = window.prompt("Şikayet nedeni?");
    if (!reason || reason.trim().length < 3) return;
    await api.reportForumEntry(accessToken, local.id, reason.trim());
    alert("Şikayet alındı");
  }

  async function hide() {
    if (!accessToken) return;
    await api.hideForumEntry(accessToken, local.id);
    setLocal({ ...local, body: "[gizlendi]" });
  }

  return (
    <article className="forum-entry">
      {showTopic && local.topic && (
        <Link href={`/baslik/${local.topic.slug}`} className="forum-entry__topic">
          {local.topic.title}
        </Link>
      )}
      <p className="forum-entry__body">{local.body}</p>
      <div className="forum-entry__foot">
        <div className="forum-entry__votes">
          <button
            type="button"
            className="vote-btn"
            disabled={busy}
            onClick={() => void vote(1)}
            aria-label="Beğen"
          >
            ▲ {local.upvotes}
          </button>
          <button
            type="button"
            className="vote-btn"
            disabled={busy}
            onClick={() => void vote(-1)}
            aria-label="Beğenme"
          >
            ▼ {local.downvotes}
          </button>
        </div>
        <div className="forum-entry__meta">
          <span>{local.author.displayName}</span>
          <span>·</span>
          <time dateTime={local.createdAt}>{formatDate(local.createdAt)}</time>
          {user && (
            <button type="button" className="linkish" onClick={() => void report()}>
              şikayet
            </button>
          )}
          {isStaff && (
            <button type="button" className="linkish" onClick={() => void hide()}>
              gizle
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function FeedList({ entries }: { entries: ForumEntry[] }) {
  return (
    <div className="forum-feed">
      {entries.map((e) => (
        <EntryCard key={e.id} entry={e} showTopic />
      ))}
      {entries.length === 0 && <p className="muted">Akış boş.</p>}
    </div>
  );
}
