'use client';

import { useEffect, useRef } from 'react';

export default function ProfileSectionSlider({ children }) {
  const sliderRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const sections = Array.from(slider.children);
    let lastActive = null;

    const getActive = () => {
      if (!sections.length) return null;
      const center = slider.scrollLeft + slider.clientWidth / 2;
      return sections.reduce((closest, section) => {
        const sectionCenter = section.offsetLeft + section.offsetWidth / 2;
        const closestCenter = closest.offsetLeft + closest.offsetWidth / 2;
        return Math.abs(sectionCenter - center) < Math.abs(closestCenter - center) ? section : closest;
      }, sections[0]);
    };

    const setHeight = () => {
      const active = getActive();
      if (!active) return;

      // Clear the previous fixed height before measuring. Otherwise a tall
      // previous section can make scrollHeight/offsetHeight stay artificially tall.
      slider.style.height = 'auto';
      const naturalHeight = active.offsetHeight;
      slider.style.height = `${naturalHeight}px`;
      lastActive = active;
    };

    const scheduleHeight = () => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(setHeight);
    };

    scheduleHeight();
    slider.addEventListener('scroll', scheduleHeight, { passive: true });
    window.addEventListener('resize', scheduleHeight);

    const resizeObserver = new ResizeObserver(() => {
      if (lastActive) scheduleHeight();
    });
    sections.forEach((section) => resizeObserver.observe(section));

    return () => {
      cancelAnimationFrame(frameRef.current);
      slider.removeEventListener('scroll', scheduleHeight);
      window.removeEventListener('resize', scheduleHeight);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={sliderRef}
      className="profile-section-slider"
      aria-label="Profile sections content"
      style={{
        display: 'flex',
        overflowX: 'auto',
        overscrollBehaviorX: 'contain',
        scrollSnapType: 'x mandatory',
        scrollBehavior: 'smooth',
        scrollbarWidth: 'none',
        margin: '0 -1px',
        paddingBottom: 8,
        alignItems: 'flex-start',
        transition: 'height .12s ease',
      }}
    >
      {children}
    </div>
  );
}
