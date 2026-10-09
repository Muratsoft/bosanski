"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

/** Öğretmen/admin bu sayfaya gelirse panele yönlendir. */
export function StudentOnly({ children }: { children: React.ReactNode }) {
  const { user, isStaff, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/giris");
      return;
    }
    if (isStaff) {
      router.replace("/admin");
    }
  }, [loading, user, isStaff, router]);

  if (loading || !user || isStaff) {
    return <p className="muted">Yükleniyor…</p>;
  }

  return <>{children}</>;
}
