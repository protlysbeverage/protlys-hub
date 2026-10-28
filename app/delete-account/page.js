import Link from 'next/link';
import '../globals.css';

const LOGO_SRC='/protlys-logo-exact.png?v=20260915';
const Section=({title,children})=><section style={{marginTop:22}}><h2 style={{fontSize:17,marginBottom:7}}>{title}</h2><div style={{fontSize:13,lineHeight:1.65,color:'var(--ink-70)'}}>{children}</div></section>;

export default async function DeleteAccountPage({searchParams}){
  const params=await searchParams;
  const deleted=params?.deleted==='1';
  return <div className="protlys-app"><main className="app-shell" style={{justifyContent:'flex-start',overflowY:'auto'}}><div className="screen-pad" style={{paddingTop:28,paddingBottom:48,maxWidth:650,margin:'0 auto'}}>
    <div style={{textAlign:'center',marginBottom:24}}><img src={LOGO_SRC} alt="Protlys" style={{width:150,height:'auto',objectFit:'contain'}}/></div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:18}}><Link href="/login" style={{fontSize:12,fontWeight:800,color:'var(--green-dark)'}}>← Sign in</Link><Link href="/privacy" style={{fontSize:12,fontWeight:800,color:'var(--green-dark)'}}>Privacy Policy →</Link></div>
    <span className="eyebrow">Protlys Hub</span><h1 style={{fontSize:27,lineHeight:1.1}}>Delete your account</h1><p className="subhead">Account and data deletion</p>
    {deleted&&<div style={{marginTop:16,background:'var(--green-soft)',border:'1px solid rgba(31,122,69,.12)',borderRadius:14,padding:'13px 14px',fontSize:12.5,lineHeight:1.55,color:'var(--green-dark)'}}>Your Protlys Hub account and associated account data have been deleted.</div>}
    <Section title="How to delete your account">Sign in to Protlys Hub, open <strong>Settings</strong>, scroll to <strong>Delete account</strong>, and select <strong>Delete my account</strong>. You will be asked to confirm twice before deletion starts.</Section>
    <Section title="What is deleted">Account authentication, profile information, movement and step records, protein logs, goals, achievements, follows, blocks, notifications, group memberships, account-created community posts and comments, likes, messages, challenge participation and other account-linked records are deleted where technically associated with your account.</Section>
    <Section title="Community content">Content created by your account, such as posts and comments, is deleted where it is stored as account-owned content. Some records may be retained only where required for security, legal, fraud-prevention or moderation purposes, subject to applicable law and our retention requirements.</Section>
    <Section title="If you cannot sign in">If you cannot access your account or need help making a deletion request, contact <a href="mailto:protlysbeverage@gmail.com" style={{color:'var(--green-dark)',fontWeight:800}}>protlysbeverage@gmail.com</a> and state that you want your Protlys Hub account and associated personal data deleted. We may ask for reasonable information to verify the account before processing the request.</Section>
    <Section title="Processing and retention">Deletion is intended to remove the account and associated personal data from active Protlys Hub systems. Limited information may be retained where necessary to meet a legal obligation, resolve disputes, protect the service, prevent abuse or fraud, or maintain necessary moderation/security records, for the applicable retention period.</Section>
    <div style={{marginTop:24,display:'flex',gap:9,flexWrap:'wrap'}}><Link href="/login" className="btn-primary" style={{textDecoration:'none',display:'inline-flex',justifyContent:'center',alignItems:'center'}}>Sign in to delete</Link><Link href="/privacy" className="btn-secondary" style={{textDecoration:'none',display:'inline-flex',justifyContent:'center',alignItems:'center'}}>Privacy Policy</Link></div>
  </div></main></div>;
}