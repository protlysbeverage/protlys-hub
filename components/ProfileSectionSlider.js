'use client';

import { useEffect, useRef } from 'react';

export default function ProfileSectionSlider({ children }) {
  const sliderRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const sections = Array.from(slider.children);

    const setHeight = () => {
      if (!sections.length) return;
      const center = slider.scrollLeft + slider.clientWidth / 2;
      let active = sections[0];
      let closest = Infinity;
      sections.forEach((section) => {
        const sectionCenter = section.offsetLeft + section.offsetWidth / 2;
        const distance = Math.abs(sectionCenter - center);
        if (distance < closest) {
          closest = distance;
          active = section;
        }
      });
      slider.style.height = `${active.scrollHeight}px`;
    };

    const scheduleHeight = () => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(setHeight);
    };

    scheduleHeight();
    slider.addEventListener('scroll', scheduleHeight, { passive: true });
    window.addEventListener('resize', scheduleHeight);

    const resizeObserver = new ResizeObserver(scheduleHeight);
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
        transition: 'height .18s ease',
      }}
    >
      {children}
    </div>
  );
}
