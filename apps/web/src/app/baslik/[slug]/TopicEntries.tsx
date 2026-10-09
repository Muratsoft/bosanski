"use client";

import { useState } from "react";
import { type ForumEntry } from "@/lib/api";
import { EntryCard } from "@/components/ForumFeed";

export function TopicEntries({ initial }: { initial: ForumEntry[] }) {
  const [entries, setEntries] = useState(initial);

  return (
    <div className="forum-feed">
      {entries.map((e) => (
        <EntryCard
          key={e.id}
          entry={e}
          onChanged={(updated) =>
            setEntries((prev) =>
              prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)),
            )
          }
        />
      ))}
      {entries.length === 0 && <p className="muted">Henüz entry yok.</p>}
    </div>
  );
}
