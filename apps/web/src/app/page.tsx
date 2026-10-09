import Link from "next/link";
import { api } from "@/lib/api";
import { FeedList, TopicList } from "@/components/ForumFeed";
import { ForumCompose } from "@/components/ForumCompose";

export default async function HomePage() {
  let topics: Awaited<ReturnType<typeof api.forumTopics>> = {
    total: 0,
    items: [],
  };
  let feed: Awaited<ReturnType<typeof api.forumFeed>> = [];

  try {
    [topics, feed] = await Promise.all([api.forumTopics(), api.forumFeed()]);
  } catch {
    // API kapalıysa sayfa yine açılsın
  }

  return (
    <>
      <section className="hero">
        <div className="hero__inner">
          <h1 className="hero__brand">Bosanski</h1>
          <p className="hero__lead">
            Türkçe’den Boşnakça, Sırpça, Hırvatça ve Karadağça’ya. Sözlük,
            dersler ve topluluk gündemi — tek platformda.
          </p>
          <div className="hero__cta">
            <Link href="/dersler" className="btn btn--clay">
              Derslere başla
            </Link>
            <Link
              href="/sozluk"
              className="btn btn--ghost"
              style={{ color: "white", borderColor: "rgba(255,255,255,.35)" }}
            >
              Sözlüğe bak
            </Link>
          </div>
        </div>
      </section>

      <section className="forum-home">
        <div className="forum-home__main">
          <h2 className="section-title">Gündem</h2>
          <p className="section-lead">
            Ekşi tarzı başlıklar. Okumak serbest; yazmak için üye ol.
          </p>
          <FeedList entries={feed} />
        </div>
        <aside className="forum-home__side">
          <div className="panel">
            <h3 className="forum-side-title">Başlıklar</h3>
            <TopicList topics={topics.items} />
          </div>
          <ForumCompose />
        </aside>
      </section>
    </>
  );
}
