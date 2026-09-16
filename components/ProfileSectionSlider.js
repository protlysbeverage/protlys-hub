'use client';

export default function ProfileSectionSlider({ children }) {
  return (
    <div
      className="profile-section-slider"
      aria-label="Profile sections content"
      style={{
        display: 'block',
        width: '100%',
        overflowX: 'visible',
        overflowY: 'visible',
        margin: '0 -1px',
        paddingBottom: 8,
      }}
    >
      {children}
    </div>
  );
}
