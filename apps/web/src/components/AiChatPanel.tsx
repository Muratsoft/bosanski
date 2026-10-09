"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, type AiUsage } from "@/lib/api";

type Msg = { role: "user" | "assistant"; content: string };

type Props = {
  mode?: "GENERAL" | "LESSON";
  lessonId?: string;
  lessonContext?: string;
  defaultLevel?: string;
  compact?: boolean;
};

export function AiChatPanel({
  mode = "GENERAL",
  lessonId,
  lessonContext,
  defaultLevel = "A1",
  compact = false,
}: Props) {
  const { user, accessToken } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [level, setLevel] = useState(defaultLevel);
  const [variant, setVariant] = useState("COMMON");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    void api.aiUsage(accessToken).then(setUsage).catch(() => undefined);
  }, [accessToken]);

  if (!user || !accessToken) {
    return (
      <div className="panel forum-compose-gate">
        Yapay zekaya soru sormak için <Link href="/giris">giriş yap</Link>.
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !input.trim()) return;
    const text = input.trim();
    setInput("");
    setBusy(true);
    setError("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    try {
      const res = await api.aiChat(accessToken, {
        message: text,
        conversationId,
        mode,
        level,
        variant,
        lessonId,
        lessonContext,
      });
      setConversationId(res.conversationId);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      setUsage(res.usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yanıt alınamadı");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`panel ai-panel ${compact ? "ai-panel--compact" : ""}`}>
      {!compact && (
        <>
          <h2 className="ai-panel__title">Dil asistanı</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Türkçe açıkla, hedef dilde örnek ver. Kota: ACTIVE {usage?.limit ?? "…"}{" "}
            / gün.
          </p>
        </>
      )}

      <div className="ai-toolbar">
        <label>
          Seviye
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            {["A1", "A2", "B1", "B2"].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Dil
          <select value={variant} onChange={(e) => setVariant(e.target.value)}>
            <option value="COMMON">
              Ortak (Boşnakça / Sırpça / Hırvatça / Karadağça)
            </option>
            <option value="BS">Boşnakça</option>
            <option value="HR">Hırvatça</option>
            <option value="SR">Sırpça</option>
            <option value="CNR">Karadağça</option>
          </select>
        </label>
        {usage && (
          <span className="badge">
            {usage.used}/{usage.limit} · {usage.provider}
          </span>
        )}
      </div>

      <div className="ai-messages">
        {messages.length === 0 && (
          <p className="muted">
            Örn: “zdravo ne demek?”, “kahve siparişi cümlesi”, “ć nasıl
            okunur?”
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={`${i}-${m.role}`}
            className={m.role === "user" ? "ai-bubble ai-bubble--user" : "ai-bubble"}
          >
            <pre>{m.content}</pre>
          </div>
        ))}
      </div>

      {error && <div className="error">{error}</div>}

      <form className="ai-form" onSubmit={onSubmit}>
        <textarea
          rows={compact ? 2 : 3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Sorunu yaz…"
          required
          minLength={2}
        />
        <button className="btn btn--solid" type="submit" disabled={busy}>
          {busy ? "Düşünüyor…" : "Sor"}
        </button>
      </form>
    </div>
  );
}
