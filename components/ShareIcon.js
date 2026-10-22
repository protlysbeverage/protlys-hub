'use client';

export function ShareIcon({ size = 18 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="18" cy="5" r="2.2" />
      <circle cx="6" cy="12" r="2.2" />
      <circle cx="18" cy="19" r="2.2" />
      <path d="m8 11 7.8-4.6M8 13l7.8 4.6" />
    </svg>
  );
}

export function ShareIconButton({ onClick, label = 'Share', disabled = false }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      style={{
        width: 32,
        height: 32,
        minWidth: 32,
        flex: '0 0 32px',
        padding: 0,
        border: 0,
        borderRadius: '50%',
        background: 'transparent',
        color: 'var(--ink-45)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <ShareIcon size={18} />
    </button>
  );
}
