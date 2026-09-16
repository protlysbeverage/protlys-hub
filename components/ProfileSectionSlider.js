'use client';

import { useSearchParams } from 'next/navigation';
import { Children, cloneElement, isValidElement } from 'react';

export default function ProfileSectionSlider({ children }) {
  const searchParams = useSearchParams();
  const activeSection = searchParams.get('section') || 'posts';

  const sections = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    const id = child.props?.id;
    const visible = id === activeSection;
    return cloneElement(child, {
      style: {
        ...child.props.style,
        display: visible ? 'block' : 'none',
      },
    });
  });

  return (
    <div
      className="profile-section-slider"
      aria-label="Profile sections content"
      style={{
        display: 'block',
        width: '100%',
        overflow: 'visible',
        margin: '0 -1px',
        paddingBottom: 8,
      }}
    >
      {sections}
    </div>
  );
}
