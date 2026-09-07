import Link from 'next/link';

const SHOPIFY_BLOG_URL = 'https://protlys.com/blogs/news';

export default function LibraryPage() {
  return (
    <div className="hub-page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Protlys Library</div>
          <h1>Learn. Move. Fuel.</h1>
          <p className="page-subtitle">Practical guides, nutrition insights and fitness content from Protlys.</p>
        </div>
      </div>

      <div className="library-feature-card">
        <div className="library-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
            <path d="M4 5.5v16M8 7h8M8 11h8" />
          </svg>
        </div>
        <div className="library-feature-copy">
          <div className="library-kicker">Protlys Journal</div>
          <h2>Articles &amp; Guides</h2>
          <p>Explore our latest articles on protein, movement, nutrition, recovery and building healthier routines.</p>
          <a className="library-primary-link" href={SHOPIFY_BLOG_URL} target="_blank" rel="noreferrer">
            Browse the Protlys Library
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      <div className="library-coming-card">
        <div>
          <div className="library-kicker">Coming soon</div>
          <h3>More content for your routine</h3>
          <p>We’ll keep adding useful resources here as new Protlys articles are published.</p>
        </div>
      </div>
    </div>
  );
}
