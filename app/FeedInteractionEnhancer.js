'use client';

import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import InteractiveComments from './InteractiveComments';

export default function FeedInteractionEnhancer({ posts = [] }) {
  useEffect(() => {
    const roots = [];
    const cards = Array.from(document.querySelectorAll('.feed-card.profile-post-card'));

    cards.forEach((card, index) => {
      const host = card.querySelector('[id^="comments-"]');
      if (!host) return;
      const postId = host.id.replace(/^comments-/, '');
      if (!postId) return;
      const post = posts.find(item => String(item.id) === String(postId));
      if (!post || host.dataset.interactiveMounted === 'true') return;

      const legacy = host.firstElementChild;
      if (legacy) legacy.style.display = 'none';

      const mount = document.createElement('div');
      mount.className = 'interactive-comments-mount';
      host.appendChild(mount);
      const root = createRoot(mount);
      root.render(<InteractiveComments postId={postId} initialCount={Number(post.comment_count || 0)} />);
      host.dataset.interactiveMounted = 'true';
      roots.push(root);
    });

    // Let the browser defer below-the-fold media so the feed becomes usable sooner.
    cards.forEach((card, index) => {
      card.querySelectorAll('img').forEach(img => {
        if (!img.closest('.profile-post-author')) {
          img.loading = index < 2 ? 'eager' : 'lazy';
          img.decoding = 'async';
          if (index >= 2) img.fetchPriority = 'low';
        }
      });
    });

    return () => roots.forEach(root => root.unmount());
  }, [posts]);

  return null;
}
