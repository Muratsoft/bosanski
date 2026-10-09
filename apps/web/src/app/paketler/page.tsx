"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, type Plan, type Subscription } from "@/lib/api";

function formatPrice(kurus: number, discountPercent = 0) {
  const final = Math.round(kurus * (1 - discountPercent / 100));
  return (final / 100).toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
  });
}

export default function PlansPage() {
  const { user, accessToken } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const isActiveMember = Boolean(
    user &&
      (user.status === "ACTIVE" ||
        sub?.status === "ACTIVE"),
  );

  async function load() {
    setLoading(true);
    setError("");
    try {
      const list = await api.plans();
      setPlans(list);
      if (accessToken) {
        const mine = await api.mySubscription(accessToken);
        setSub(mine);
      } else {
        setSub(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function choosePlan(planCode: string) {
    if (!accessToken) {
      window.location.href = "/giris";
      return;
    }
    try {
      await api.subscribe(accessToken, {
        planCode,
        referralCode: referralCode || undefined,
      });
      setMessage("Abonelik oluşturuldu. Dekont bilgisini gönder.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Abonelik başarısız");
    }
  }

  async function submitReceipt(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !sub?.payments?.[0]) return;
    try {
      await api.submitPayment(accessToken, sub.payments[0].id, {
        receiptUrl: receiptUrl || undefined,
        note: note || undefined,
      });
      setMessage("Dekont gönderildi. Admin onayı bekleniyor.");
      setReceiptUrl("");
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gönderilemedi");
    }
  }

  const pendingPayment = sub?.payments?.find((p) => p.status === "PENDING");

  if (isActiveMember && !pendingPayment) {
    return (
      <>
        <h1 className="section-title">Paketler</h1>
        <p className="section-lead">
          Zaten aktif üyeliğin var. Detaylar için{" "}
          <Link href="/profil">profiline</Link> bak.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="section-title">Paketler</h1>
      <p className="section-lead">
        Manuel havale / EFT. Admin onayından sonra hesabın ACTIVE olur; canlı
        ders ve AI açılır. Arkadaşını getir → bonus gün.
      </p>

      {user && (
        <div className="panel" style={{ marginBottom: "1.25rem" }}>
          <p className="muted" style={{ margin: 0 }}>
            Senin davet kodun: <strong>{user.referralCode}</strong>
          </p>
        </div>
      )}

      {message && (
        <div
          className="panel"
          style={{ marginBottom: "1rem", background: "rgba(15,92,87,.08)" }}
        >
          {message}
        </div>
      )}
      {error && <div className="error">{error}</div>}

      {loading ? (
        <p className="muted">Yükleniyor…</p>
      ) : (
        <div className="grid-2" style={{ marginBottom: "1.5rem" }}>
          {plans.map((p) => (
            <article key={p.id} className="panel stack plan-card">
              <h2 className="plan-card__title">{p.name}</h2>
              <p className="muted" style={{ margin: 0 }}>
                {p.description}
              </p>
              <div className="plan-card__price">
                {formatPrice(p.priceTry, p.discountPercent)}
                {p.discountPercent > 0 && (
                  <span className="badge">%{p.discountPercent} indirim</span>
                )}
              </div>
              <p className="muted" style={{ margin: 0 }}>
                {p.durationMonths} ay · referral bonus {p.referralBonusDays} gün
              </p>
              {!sub && (
                <button
                  type="button"
                  className="btn btn--solid"
                  onClick={() => void choosePlan(p.code)}
                >
                  {user ? "Bu paketi seç" : "Giriş yapıp seç"}
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      {!sub && user && (
        <div className="panel stack" style={{ maxWidth: 480, marginBottom: "1.5rem" }}>
          <div className="field">
            <label htmlFor="ref">Davet kodu (opsiyonel)</label>
            <input
              id="ref"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              placeholder="Arkadaşının kodu"
            />
          </div>
        </div>
      )}

      {sub && (
        <section className="panel stack">
          <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>
            Aboneliğin
          </h2>
          <p>
            <strong>{sub.plan.name}</strong> · {sub.status}
            {sub.endsAt && (
              <>
                {" "}
                · bitiş{" "}
                {new Date(sub.endsAt).toLocaleDateString("tr-TR")}
              </>
            )}
          </p>
          {sub.status === "PENDING_PAYMENT" && pendingPayment && (
            <form className="stack" onSubmit={submitReceipt}>
              <p className="muted">
                Ödenecek:{" "}
                <strong>{formatPrice(pendingPayment.amountTry)}</strong>
                <br />
                IBAN bilgisi için eğitmenle iletişime geç; dekont linkini veya
                notu buraya yaz.
              </p>
              <div className="field">
                <label>Dekont linki (Drive / foto URL)</label>
                <input
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="field">
                <label>Not</label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Havale açıklaması, tarih…"
                />
              </div>
              <button className="btn btn--clay" type="submit">
                Dekontu gönder
              </button>
            </form>
          )}
          {sub.status === "ACTIVE" && (
            <p className="muted">
              Hesabın aktif. <Link href="/takvim">Takvimden</Link> canlı derse
              kaydolabilirsin.
            </p>
          )}
        </section>
      )}
    </>
  );
}
