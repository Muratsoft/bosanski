import { AiChatPanel } from "@/components/AiChatPanel";

export default function AiPage() {
  return (
    <>
      <h1 className="section-title">Yapay zeka</h1>
      <p className="section-lead">
        Genel dil asistanı. Seviye ve BCS varyantını seç; Türkçe açıklama +
        hedef dilde örnek al. ACTIVE üyelikte günlük kota daha yüksek.
      </p>
      <AiChatPanel mode="GENERAL" />
    </>
  );
}
