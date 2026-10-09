import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="protlys-app">
      <main className="app-shell" style={{ justifyContent: 'center' }}>
        <section className="screen-pad" style={{ width: '100%', maxWidth: 460, textAlign: 'center' }}>
          <img src="/protlys-logo-exact.png?v=3" alt="Protlys" style={{ width: 132, height: 'auto', objectFit: 'contain', margin: '0 auto 30px' }} />
          <p className="eyebrow">404 · PAGE NOT FOUND</p>
          <h1 style={{ fontSize: 30, lineHeight: 1.1, margin: '10px 0' }}>This path went for a walk.</h1>
          <p className="subhead" style={{ margin: '0 auto 24px', maxWidth: 320 }}>
            We couldn't find that page. Head back to the Hub and keep moving.
          </p>
          <Link href="/" className="primary-btn" style={{ display: 'inline-flex', textDecoration: 'none', alignItems: 'center', justifyContent: 'center' }}>
            Back to Protlys Hub
          </Link>
        </section>
      </main>
    </div>
  );
}
