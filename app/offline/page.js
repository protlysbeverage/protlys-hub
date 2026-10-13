export default function OfflinePage() {
  return <main className="screen-pad" style={{maxWidth:560,margin:'0 auto',paddingTop:48}}>
    <span className="eyebrow">Protlys Hub</span>
    <h1 style={{marginTop:8}}>You’re offline</h1>
    <p className="subhead">Reconnect to the internet, then try again. Pages and actions that need your account data are not available offline yet.</p>
    <a className="btn-primary" href="/" style={{display:'inline-block',width:'auto',textDecoration:'none',padding:'11px 16px'}}>Try again</a>
  </main>;
}
