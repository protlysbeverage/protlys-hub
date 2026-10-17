import Link from 'next/link';

export const metadata = { title: 'Account deletion | Protlys Hub' };

export default function AccountDeletionPage() {
  return <main className="screen-pad" style={{maxWidth:760,margin:'0 auto',paddingTop:36,paddingBottom:64}}>
    <span className="eyebrow">Account</span><h1>Delete your Protlys Hub account</h1>
    <p>Signed-in members can permanently delete their account from <Link href="/settings">Settings → Delete my account</Link>.</p>
    <p>If you cannot sign in, contact Protlys using the current contact details published on protlys.com and ask for “Protlys Hub account deletion”. Include the email address used for the Hub so the request can be verified.</p>
    <p>Deletion removes the authentication account and associated Hub application data. Some limited records may be retained where required for legal, fraud-prevention or security purposes.</p>
    <p><Link href="/privacy">Read the Privacy Policy</Link></p>
  </main>;
}
