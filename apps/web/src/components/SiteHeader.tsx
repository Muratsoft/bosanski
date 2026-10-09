"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

function linkClass(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/" ? "nav__link is-active" : "nav__link";
  }
  return pathname.startsWith(href) ? "nav__link is-active" : "nav__link";
}

export function SiteHeader() {
  const pathname = usePathname();
  const { user, logout, isStaff, loading } = useAuth();

  /** Misafir: tanıtım / satış */
  const guestLinks = [
    { href: "/", label: "Gündem" },
    { href: "/paketler", label: "Paketler" },
    { href: "/dersler", label: "Dersler" },
    { href: "/sozluk", label: "Sözlük" },
    { href: "/oyunlar", label: "Oyunlar" },
    { href: "/ara", label: "Ara" },
  ];

  /** Öğrenci */
  const studentLinks = [
    { href: "/", label: "Gündem" },
    { href: "/gruplar", label: "Grubum" },
    { href: "/takvim", label: "Takvim" },
    { href: "/dersler", label: "Dersler" },
    { href: "/odevlerim", label: "Ödevlerim" },
    { href: "/zeka", label: "YZ" },
    { href: "/kendini-sina", label: "Kendini sına" },
    { href: "/oyunlar", label: "Oyunlar" },
    { href: "/sozluk", label: "Sözlük" },
    { href: "/profil", label: "Profil" },
  ];

  /** Admin / öğretmen — öğrenci sayfaları yok */
  const staffLinks = [
    { href: "/admin", label: "Panel" },
    { href: "/gruplar", label: "Gruplarım" },
    { href: "/takvim", label: "Takvim" },
  ];

  const links = !user
    ? guestLinks
    : isStaff
      ? staffLinks
      : studentLinks;

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href={isStaff ? "/admin" : "/"} className="brand">
          Bosanski
        </Link>
        <nav className="nav">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={linkClass(pathname, l.href)}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="site-header__actions">
          {loading ? null : user ? (
            <>
              <Link
                href={isStaff ? "/admin" : "/profil"}
                className="user-chip"
              >
                {user.displayName}
                {isStaff ? " · Öğretmen" : ""}
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
