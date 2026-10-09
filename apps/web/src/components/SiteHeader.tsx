"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const links = [
  { href: "/", label: "Gündem" },
  { href: "/takvim", label: "Takvim" },
  { href: "/paketler", label: "Paketler" },
  { href: "/zeka", label: "YZ" },
  { href: "/oyunlar", label: "Oyunlar" },
  { href: "/sozluk", label: "Sözlük" },
  { href: "/dersler", label: "Dersler" },
  { href: "/ara", label: "Ara" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user, logout, isStaff, loading } = useAuth();

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
              className={pathname.startsWith(l.href) ? "nav__link is-active" : "nav__link"}
            >
              {l.label}
            </Link>
          ))}
          {isStaff && (
            <Link
              href="/admin"
              className={pathname.startsWith("/admin") ? "nav__link is-active" : "nav__link"}
            >
              Admin
            </Link>
          )}
        </nav>
        <div className="site-header__actions">
          {loading ? null : user ? (
            <>
              <span className="user-chip">{user.displayName}</span>
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
