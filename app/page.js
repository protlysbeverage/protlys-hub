import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const siteUrl = 'https://hub.protlys.com';
const faqs = [
  { question: 'What is Protlys Hub?', answer: 'Protlys Hub is a community app for adults who want to track daily movement, keep an eye on protein intake, take part in challenges and stay connected with other members.' },
  { question: 'Can I track my steps with Protlys Hub?', answer: 'Yes. Protlys Hub includes movement tracking and step goals. Supported Android devices can record steps automatically after the required activity permission is granted.' },
  { question: 'Can I track protein in Protlys Hub?', answer: 'Yes. The Hub includes protein goals and logging tools to help you keep track of your daily intake. It is a tracking tool, not medical or dietetic advice.' },
  { question: 'Can I join movement challenges?', answer: 'Yes. Members can take part in community challenges and follow progress over time.' },
  { question: 'Who can create an account?', answer: 'Protlys Hub accounts are for adults aged 18 and over. You can review the Terms and Conditions and Privacy Policy before signing up.' },
];

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Protlys',
    url: siteUrl,
    logo: siteUrl + '/protlys-logo-exact.png',
    description: 'A Kenyan fitness and functional nutrition brand building practical tools and products around movement, protein and community.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Protlys Hub',
    url: siteUrl,
    inLanguage: 'en-KE',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl + '/' },
    ],
  },
];

export const metadata = {
  title: 'Protlys Hub | Step Tracking, Protein Goals & Fitness Challenges in Kenya',
  description: 'Track your steps, set protein goals and join community fitness challenges with Protlys Hub. A practical movement and nutrition community built in Kenya.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Protlys Hub | Move More. Fuel Better.',
    description: 'Track movement, keep up with protein goals and take on challenges with the Protlys community.',
    url: siteUrl + '/',
    siteName: 'Protlys Hub',
    locale: 'en_KE',
    type: 'website',
    images: [{ url: siteUrl + '/protlys-logo-exact.png', alt: 'Protlys Hub logo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Protlys Hub | Move More. Fuel Better.',
    description: 'Track movement, keep up with protein goals and take on challenges with the Protlys community.',
    images: [siteUrl + '/protlys-logo-exact.png'],
  },
};

function Schema() {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />;
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/movement');

  return (
    <main style={{ minHeight: '100vh', background: '#F7F8F6', color: '#172019', fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
      <Schema />
      <header style={{ maxWidth: 1120, margin: '0 auto', padding: '22px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <Link href="/" aria-label="Protlys Hub home" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 20, textDecoration: 'none', color: '#172019' }}>
          <img src="/protlys-logo-exact.png" alt="Protlys logo" width="38" height="38" style={{ objectFit: 'contain' }} />
          Protlys Hub
        </Link>
        <nav aria-label="Main navigation" style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 14, fontWeight: 700 }}>
          <a href="#how-it-works" style={{ color: 'inherit', textDecoration: 'none' }}>How it works</a>
          <a href="#faqs" style={{ color: 'inherit', textDecoration: 'none' }}>FAQs</a>
          <Link href="/login" style={{ color: 'inherit', textDecoration: 'none' }}>Log in</Link>
          <Link href="/signup" style={{ background: '#6BCB45', color: '#10200F', padding: '11px 17px', borderRadius: 999, textDecoration: 'none' }}>Join Protlys</Link>
        </nav>
      </header>

      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '76px 24px 82px', display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(260px,.8fr)', gap: 44, alignItems: 'center' }}>
        <div>
          <p style={{ margin: '0 0 14px', color: '#367D28', fontWeight: 800, letterSpacing: 1.6, fontSize: 12, textTransform: 'uppercase' }}>Movement · Protein · Community</p>
          <h1 style={{ fontSize: 'clamp(40px,7vw,68px)', lineHeight: 1.04, letterSpacing: '-2.8px', margin: '0 0 22px', maxWidth: 720 }}>Move more. Fuel better. Keep going.</h1>
          <p style={{ fontSize: 18, lineHeight: 1.7, color: '#526052', maxWidth: 650, margin: '0 0 28px' }}>Protlys Hub brings your daily movement, protein goals and community challenges into one place. Set a target, see your progress and build habits alongside other people.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/signup" style={{ background: '#6BCB45', color: '#10200F', borderRadius: 999, padding: '15px 23px', fontWeight: 800, textDecoration: 'none' }}>Create your account</Link>
            <Link href="/login" style={{ border: '1px solid #C9D3C6', color: '#172019', borderRadius: 999, padding: '15px 23px', fontWeight: 800, textDecoration: 'none' }}>Log in</Link>
          </div>
          <p style={{ marginTop: 16, fontSize: 12, color: '#718071' }}>For adults aged 18 and over.</p>
        </div>
        <aside aria-label="What you can do in Protlys Hub" style={{ background: '#101810', color: '#F7F8F6', borderRadius: 28, padding: 28, boxShadow: '0 24px 70px rgba(20,40,20,.12)' }}>
          <p style={{ margin: '0 0 22px', color: '#9BD782', fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase' }}>Your progress, together</p>
          {[
            ['01', 'Track movement', 'Keep an eye on your steps and daily movement goals.'],
            ['02', 'Log protein', 'Record your intake and work towards a daily protein goal.'],
            ['03', 'Join challenges', 'Take part in shared goals and follow your progress.'],
            ['04', 'Find your people', 'Share updates and connect with the Protlys community.'],
          ].map(([n, title, body]) => <div key={n} style={{ display: 'grid', gridTemplateColumns: '34px 1fr', gap: 12, padding: '15px 0', borderTop: '1px solid #2B392B' }}>
            <span style={{ color: '#9BD782', fontSize: 12, fontWeight: 800 }}>{n}</span>
            <div><h2 style={{ margin: 0, fontSize: 17 }}>{title}</h2><p style={{ margin: '5px 0 0', color: '#B7C3B4', fontSize: 13, lineHeight: 1.6 }}>{body}</p></div>
          </div>)}
        </aside>
      </section>

      <section id="how-it-works" style={{ background: '#EAF2E7', padding: '66px 24px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <p style={{ margin: '0 0 10px', color: '#367D28', fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase' }}>A simple place to stay on track</p>
          <h2 style={{ fontSize: 'clamp(28px,4vw,42px)', letterSpacing: '-1.4px', margin: '0 0 30px' }}>Small actions add up.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
            {[
              ['Movement tracking', 'Set a realistic step goal and check how your daily activity is adding up.'],
              ['Protein goals', 'Keep a simple record of the protein you eat and see how it compares with your target.'],
              ['Community challenges', 'Take on a shared challenge, follow the leaderboard and encourage other members.'],
            ].map(([title, body]) => <article key={title} style={{ background: '#FFFFFF', border: '1px solid #DCE6D8', borderRadius: 18, padding: 22 }}>
              <h3 style={{ margin: '0 0 9px', fontSize: 18 }}>{title}</h3>
              <p style={{ margin: 0, color: '#596658', fontSize: 14, lineHeight: 1.7 }}>{body}</p>
            </article>)}
          </div>
        </div>
      </section>

      <section id="faqs" style={{ maxWidth: 860, margin: '0 auto', padding: '68px 24px 76px' }}>
        <p style={{ margin: '0 0 10px', color: '#367D28', fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase' }}>Good to know</p>
        <h2 style={{ fontSize: 'clamp(28px,4vw,42px)', letterSpacing: '-1.4px', margin: '0 0 24px' }}>Frequently asked questions</h2>
        {faqs.map(({ question, answer }) => <details key={question} style={{ borderTop: '1px solid #DCE3D9', padding: '17px 0' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 16 }}>{question}</summary>
          <p style={{ margin: '11px 0 0', color: '#596658', fontSize: 14, lineHeight: 1.7 }}>{answer}</p>
        </details>)}
      </section>

      <section style={{ background: '#101810', color: '#F7F8F6', padding: '48px 24px', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 'clamp(26px,4vw,38px)' }}>Make your next good day easier to repeat.</h2>
        <p style={{ margin: '0 auto 22px', maxWidth: 600, color: '#B7C3B4', lineHeight: 1.7 }}>Start with a movement goal, keep track of your protein and find a challenge that keeps you moving.</p>
        <Link href="/signup" style={{ display: 'inline-block', background: '#6BCB45', color: '#10200F', borderRadius: 999, padding: '14px 22px', fontWeight: 800, textDecoration: 'none' }}>Join Protlys Hub</Link>
      </section>

      <footer style={{ maxWidth: 1120, margin: '0 auto', padding: '26px 24px 40px', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', color: '#637061', fontSize: 13 }}>
        <span>© {new Date().getFullYear()} Protlys. Built in Kenya.</span>
        <nav aria-label="Footer navigation" style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/delete-account">Delete account</Link><Link href="/login">Log in</Link>
        </nav>
      </footer>
      <style>{'@media(max-width:700px){header{flex-wrap:wrap}header nav a[href="#how-it-works"],header nav a[href="#faqs"]{display:none}main section:first-of-type{grid-template-columns:1fr!important;padding-top:48px!important}main section:first-of-type aside{max-width:520px}}'}</style>
    </main>
  );
}
