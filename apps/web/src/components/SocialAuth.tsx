"use client";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export function SocialAuth() {
  return (
    <div className="social-auth">
      <div className="social-auth__divider">
        <span>veya</span>
      </div>
      <a className="btn btn--ghost social-auth__google" href={`${API_URL}/auth/google`}>
        Google ile devam et
      </a>
    </div>
  );
}
