"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type TickerWord } from "@/lib/api";

const SEED: TickerWord[] = [
  { tr: "merhaba", target: "zdravo", variant: "BS" },
  { tr: "teşekkürler", target: "hvala", variant: "COMMON" },
  { tr: "lütfen", target: "molim", variant: "COMMON" },
  { tr: "evet", target: "da", variant: "COMMON" },
  { tr: "hayır", target: "ne", variant: "COMMON" },
  { tr: "su", target: "voda", variant: "COMMON" },
  { tr: "ekmek", target: "hljeb", variant: "BS" },
  { tr: "süt", target: "mlijeko", variant: "BS" },
  { tr: "ev", target: "kuća", variant: "COMMON" },
  { tr: "okul", target: "škola", variant: "COMMON" },
  { tr: "arkadaş", target: "prijatelj", variant: "COMMON" },
  { tr: "günaydın", target: "dobro jutro", variant: "COMMON" },
  { tr: "iyi geceler", target: "laku noć", variant: "COMMON" },
  { tr: "nasılsın", target: "kako si", variant: "COMMON" },
  { tr: "bir", target: "jedan", variant: "COMMON" },
];

function oneLanguage(words: TickerWord[]) {
  const seen = new Set<string>();
  const out: TickerWord[] = [];
  for (const word of words) {
    const key = word.tr.toLocaleLowerCase("tr");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(word);
  }
  return out;
}

function Row({ words }: { words: TickerWord[] }) {
  return (
    <>
      {words.map((word, i) => (
        <Link
          key={`${word.tr}-${word.target}-${i}`}
          href={`/sozluk?q=${encodeURIComponent(word.tr)}`}
          className="word-ticker__item"
        >
          <span className="word-ticker__tr">{word.tr}</span>
          <span className="word-ticker__target">{word.target}</span>
        </Link>
      ))}
    </>
  );
}

export function WordTicker() {
  const [words, setWords] = useState<TickerWord[]>(SEED);
  const [source, setSource] = useState<"ai" | "seed">("seed");

  useEffect(() => {
    let cancelled = false;
    void api
      .ticker()
      .then((res) => {
        const words = oneLanguage(res.words);
        if (cancelled || words.length < 8) return;
        setWords(words);
        setSource(res.source);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const duration = `${Math.max(words.length, 8) * 4}s`;

  return (
    <div className="word-ticker" aria-label="Kayan kelime listesi">
      <span className="word-ticker__label">
        {source === "ai" ? "YZ" : "Kelime"}
      </span>
      <div className="word-ticker__viewport">
        <div className="word-ticker__track" style={{ animationDuration: duration }}>
          <div className="word-ticker__set">
            <Row words={words} />
          </div>
          <div className="word-ticker__set" aria-hidden="true" inert>
            <Row words={words} />
          </div>
        </div>
      </div>
    </div>
  );
}
