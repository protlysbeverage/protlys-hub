"use client";

import { useState } from "react";
import * as Sentry from "@sentry/nextjs";

export default function SentryExamplePage() {
  const [sent, setSent] = useState(false);

  function sendTestError() {
    Sentry.captureException(
      new Error("Sentry test event — Protlys Hub SDK verification"),
      {
        tags: {
          test: "sentry-sdk-verification",
          environment: "preview",
        },
      }
    );
    setSent(true);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "#0D0F0E",
        color: "#F7F8F6",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <section style={{ width: "100%", maxWidth: "520px" }}>
        <p style={{ color: "#6BCB45", fontWeight: 700, letterSpacing: "0.08em" }}>
          PROTLYS HUB · SENTRY CHECK
        </p>
        <h1 style={{ fontSize: "28px", marginBottom: "12px" }}>
          Verify error monitoring
        </h1>
        <p style={{ color: "#B8BDB7", lineHeight: 1.6 }}>
          This temporary preview-only page sends one controlled test exception
          to Sentry. It does not change account data or any Hub feature.
        </p>
        <button
          type="button"
          onClick={sendTestError}
          disabled={sent}
          style={{
            marginTop: "20px",
            padding: "13px 18px",
            border: 0,
            borderRadius: "8px",
            background: sent ? "#394137" : "#6BCB45",
            color: "#111",
            fontWeight: 700,
            cursor: sent ? "default" : "pointer",
          }}
        >
          {sent ? "Test event submitted" : "Send test error to Sentry"}
        </button>
        {sent && (
          <p role="status" style={{ color: "#6BCB45", marginTop: "14px" }}>
            Test exception submitted. Check the protlys-hub project in Sentry.
          </p>
        )}
      </section>
    </main>
  );
}
