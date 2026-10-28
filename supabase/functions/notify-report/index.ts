import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type'};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok',{headers:cors});
  try {
    const auth=req.headers.get('Authorization')||'';
    const url=Deno.env.get('SUPABASE_URL');
    const key=Deno.env.get('SUPABASE_ANON_KEY');
    const resendKey=Deno.env.get('RESEND_API_KEY');
    if(!url||!key||!resendKey) return new Response(JSON.stringify({error:'Report email service is not configured.'}),{status:503,headers:{...cors,'Content-Type':'application/json'}});
    const supabase=createClient(url,key,{global:{headers:{Authorization:auth}}});
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(authError||!user)return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:{...cors,'Content-Type':'application/json'}});
    const {reportId}=await req.json();
    if(!reportId)return new Response(JSON.stringify({error:'Missing reportId'}),{status:400,headers:{...cors,'Content-Type':'application/json'}});
    const {data:report,error}=await supabase.from('reports').select('id,reporter_id,reported_user_id,content_type,content_id,reason,details,content_snapshot,status,created_at').eq('id',String(reportId)).eq('reporter_id',user.id).maybeSingle();
    if(error||!report)return new Response(JSON.stringify({error:'Report not found'}),{status:404,headers:{...cors,'Content-Type':'application/json'}});
    const html='<h2>New Protlys Hub report</h2>'+
      '<p><strong>Reason:</strong> '+escapeHtml(report.reason)+'</p>'+
      '<p><strong>Content:</strong> '+escapeHtml(report.content_type)+' / '+escapeHtml(report.content_id)+'</p>'+
      '<p><strong>Reporter:</strong> '+escapeHtml(report.reporter_id)+'</p>'+
      '<p><strong>Reported user:</strong> '+escapeHtml(report.reported_user_id)+'</p>'+
      '<p><strong>Details:</strong> '+escapeHtml(report.details||'None')+'</p>'+
      '<p><strong>Created:</strong> '+escapeHtml(report.created_at)+'</p>'+
      '<pre style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:8px;">'+escapeHtml(JSON.stringify(report.content_snapshot||{},null,2))+'</pre>';
    const resend=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+resendKey,'Content-Type':'application/json','Idempotency-Key':'protlys-report/'+report.id},body:JSON.stringify({from:Deno.env.get('REPORT_FROM_EMAIL')||'Protlys Hub <noreply@protlys.com>',to:[Deno.env.get('REPORT_TO_EMAIL')||'protlysbeverage@gmail.com'],subject:'Protlys Hub report · '+report.reason,html})});
    if(!resend.ok){console.error('Resend report notification failed',await resend.text());return new Response(JSON.stringify({error:'Report saved but notification failed.'}),{status:502,headers:{...cors,'Content-Type':'application/json'}})}
    return new Response(JSON.stringify({ok:true}),{status:200,headers:{...cors,'Content-Type':'application/json'}});
  } catch(error){console.error('notify-report failed',error);return new Response(JSON.stringify({error:'Report notification failed.'}),{status:500,headers:{...cors,'Content-Type':'application/json'}})}
});
function escapeHtml(value){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");}
