"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    if (error) Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#F7F8F6", color: "#111", fontFamily: "Arial, sans-serif" }}>
        <main style={{ width: "min(100%, 380px)", padding: 28, borderRadius: 20, background: "#fff", border: "1px solid #e5e8e2", textAlign: "center" }}>
          <img src="/protlys-logo-exact.png" alt="Protlys" width="116" style={{ height: "auto", marginBottom: 18 }} />
          <h1 style={{ fontSize: 21, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ color: "#62685f", fontSize: 14, lineHeight: 1.5, margin: "0 0 20px" }}>Your account and saved progress are safe. Try opening this screen again.</p>
          <button onClick={() => reset()} style={{ border: 0, borderRadius: 999, padding: "11px 20px", background: "#6BCB45", color: "#111", fontWeight: 800, cursor: "pointer" }}>Try again</button>
          <button onClick={() => window.location.assign("/feed")} style={{ border: 0, background: "transparent", padding: 12, color: "#416f31", fontWeight: 700, cursor: "pointer" }}>Open feed</button>
        </main>
      </body>
    </html>
  );
}
