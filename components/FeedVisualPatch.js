'use client';

export default function FeedVisualPatch() {
  return <style>{`
    /* Homepage feed: restore the wider original card proportions. */
    .protlys-app .feed-home { padding: 18px 12px 18px !important; }
    .protlys-app .feed-home > h1 { font-size: 27px !important; line-height: 1.08 !important; letter-spacing: -.025em !important; }
    .protlys-app .feed-home > .subhead { max-width: 380px; margin-bottom: 14px !important; }

    .feed-mode-shell { padding: 0 12px; }
    .feed-mode-shell > div { margin: 8px 0 10px !important; }
    .feed-following-content { padding-top: 4px !important; }

    .protlys-app .feed-card.profile-post-card {
      background: #fff !important;
      border: 1.5px solid var(--line) !important;
      border-radius: 18px !important;
      padding: 16px !important;
      margin: 0 0 11px !important;
      box-shadow: 0 2px 9px rgba(15,42,74,.035) !important;
      overflow: visible !important;
    }

    .protlys-app .profile-post-topline {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 10px !important;
      padding: 0 0 11px !important;
    }
    .protlys-app .profile-post-author {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      min-width: 0 !important;
    }
    .protlys-app .profile-post-author .feed-author {
      font-family: 'Manrope', sans-serif !important;
      font-size: 14px !important;
      line-height: 1.2 !important;
      font-weight: 800 !important;
      color: var(--ink) !important;
    }
    .protlys-app .profile-post-author .feed-meta {
      font-size: 11px !important;
      color: var(--ink-45) !important;
      margin-top: 4px !important;
      line-height: 1.2 !important;
    }
    .protlys-app .profile-post-type {
      display: inline-flex !important;
      align-items: center !important;
      min-height: 28px !important;
      padding: 4px 10px !important;
      border-radius: 999px !important;
      background: var(--green-soft) !important;
      color: var(--green-dark) !important;
      font-size: 10.5px !important;
      font-weight: 800 !important;
      white-space: nowrap !important;
    }

    .protlys-app .feed-card-body {
      padding: 0 !important;
      font-size: 15.5px !important;
      line-height: 1.5 !important;
      color: var(--ink) !important;
    }
    .protlys-app .feed-card-body p {
      margin: 0 !important;
      font-size: 15.5px !important;
      line-height: 1.5 !important;
    }
    .protlys-app .feed-card-body img {
      display: block !important;
      width: 100% !important;
      max-height: 520px !important;
      margin: 12px 0 0 !important;
      border-radius: 14px !important;
      object-fit: cover !important;
    }

    .protlys-app .profile-post-engagement {
      margin-top: 14px !important;
      padding-top: 12px !important;
      border-top: 1px solid var(--line) !important;
    }
    .protlys-app .profile-post-actions {
      display: flex !important;
      align-items: center !important;
      gap: 22px !important;
      min-height: 28px !important;
    }
    .protlys-app .profile-action {
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      border: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      background: transparent !important;
      color: var(--ink) !important;
      font-family: 'Manrope', sans-serif !important;
      font-size: 14px !important;
      font-weight: 800 !important;
      cursor: pointer !important;
    }
    .protlys-app .profile-action.liked,
    .protlys-app .profile-action.liked svg { color: #E1306C !important; }
    .protlys-app .profile-action.share-action { font-weight: 700 !important; }
    .protlys-app .profile-like-summary {
      margin-top: 11px !important;
      font-size: 13px !important;
      line-height: 1.25 !important;
      font-weight: 800 !important;
      color: var(--ink) !important;
    }

    .protlys-app .profile-comments { margin-top: 10px !important; }
    .protlys-app .profile-comment { gap: 10px !important; }
    .protlys-app .profile-comment > div:last-child { min-width: 0; }
    .protlys-app .profile-comment-input { margin-top: 14px !important; gap: 9px !important; }
    .protlys-app .profile-comment-input .field-input { min-height: 46px !important; padding: 11px 14px !important; border-radius: 999px !important; font-size: 14px !important; background: #fff !important; }
    .protlys-app .profile-comment-input .btn-secondary { min-height: 46px !important; min-width: 78px !important; padding: 10px 16px !important; border-radius: 999px !important; font-size: 13px !important; white-space: nowrap !important; }

    .protlys-app .post-more-btn { width: 30px !important; height: 30px !important; padding: 5px !important; border: 0 !important; border-radius: 50% !important; background: transparent !important; color: var(--ink-45) !important; cursor: pointer !important; }
    .protlys-app .post-more-btn:hover { background: var(--paper) !important; color: var(--ink) !important; }
    .protlys-app .feed-composer { border: 1.5px solid var(--line) !important; border-radius: 18px !important; box-shadow: 0 2px 8px rgba(15,42,74,.03) !important; padding: 14px !important; margin-bottom: 13px !important; }

    @media (max-width: 420px) {
      .protlys-app .feed-home { padding-left: 12px !important; padding-right: 12px !important; }
      .feed-mode-shell { padding-left: 12px; padding-right: 12px; }
      .protlys-app .profile-post-actions { gap: 19px !important; }
      .protlys-app .profile-post-card { padding: 15px !important; }
    }
  `}</style>;
}
