"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

export function SiteHeader() {
  const pathname = usePathname();
  const { user, logout, isStaff, loading } = useAuth();

  const links = [
    { href: "/", label: "Gündem", show: true },
    { href: "/takvim", label: "Takvim", show: Boolean(user) },
    {
      href: "/paketler",
      label: "Paketler",
      show: !user,
    },
    { href: "/zeka", label: "YZ", show: Boolean(user) },
    { href: "/kendini-sina", label: "Kendini sına", show: Boolean(user) },
    { href: "/oyunlar", label: "Oyunlar", show: true },
    { href: "/sozluk", label: "Sözlük", show: true },
    { href: "/dersler", label: "Dersler", show: true },
    { href: "/gruplar", label: "Grubum", show: Boolean(user) },
    { href: "/profil", label: "Profil", show: Boolean(user) },
    { href: "/ara", label: "Ara", show: true },
  ].filter((l) => l.show);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand">
          Bosanski
        </Link>
        <nav className="nav">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                pathname.startsWith(l.href) && l.href !== "/"
                  ? "nav__link is-active"
                  : pathname === l.href
                    ? "nav__link is-active"
                    : "nav__link"
              }
            >
              {l.label}
            </Link>
          ))}
          {isStaff && (
            <Link
              href="/admin"
              className={
                pathname.startsWith("/admin") ? "nav__link is-active" : "nav__link"
              }
            >
              Admin
            </Link>
          )}
        </nav>
        <div className="site-header__actions">
          {loading ? null : user ? (
            <>
              <Link href="/profil" className="user-chip">
                {user.displayName}
              </Link>
              <button type="button" className="btn btn--ghost" onClick={logout}>
                Çıkış
              </button>
            </>
          ) : (
            <>
              <Link href="/giris" className="btn btn--ghost">
                Giriş
              </Link>
              <Link href="/kayit" className="btn btn--solid">
                Üye ol
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
