'use client';

import { useEffect } from 'react';

const sections = ['posts', 'stats', 'photos'];

export default function ProfileSectionTabs() {
  useEffect(() => {
    const nav = document.querySelector('nav[aria-label="Profile sections"]');
    const slider = document.querySelector('.profile-section-slider');
    if (!nav || !slider) return;

    const links = sections.map(id => nav.querySelector(`a[href="#${id}"]`));
    const setActive = id => {
      links.forEach(link => {
        if (!link) return;
        const active = link.getAttribute('href') === `#${id}`;
        link.style.background = active ? '#fff' : 'transparent';
        link.style.color = active ? 'var(--ink)' : 'var(--green-dark)';
        link.style.boxShadow = active ? '0 1px 3px rgba(0,0,0,.04)' : 'none';
        link.setAttribute('aria-current', active ? 'page' : 'false');
      });
    };

    const targets = sections.map(id => document.getElementById(id)).filter(Boolean);
    const observer = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    }, { root: slider, threshold: [0.55, 0.75, 0.9] });

    targets.forEach(target => observer.observe(target));

    const handlers = links.map((link, index) => {
      if (!link) return null;
      const handler = event => {
        event.preventDefault();
        const target = targets[index];
        if (!target) return;
        setActive(sections[index]);
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      };
      link.addEventListener('click', handler);
      return handler;
    });

    setActive('posts');
    return () => {
      observer.disconnect();
      links.forEach((link, index) => {
        if (link && handlers[index]) link.removeEventListener('click', handlers[index]);
      });
    };
  }, []);

  return null;
}
