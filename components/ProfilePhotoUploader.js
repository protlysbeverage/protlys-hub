'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ProfilePhotoUploader({ name, url, size = 64 }) {
  const fileRef = useRef(null);
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  async function handlePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return setMessage('Choose an image file.');
    if (file.size > 5 * 1024 * 1024) return setMessage('Photo must be 5MB or smaller.');

    setUploading(true);
    setMessage('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `avatars/${user.id}/profile-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('feed-images').upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('feed-images').getPublicUrl(path);
      const { error: profileError } = await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', user.id);
      if (profileError) throw profileError;

      setMessage('Profile photo updated.');
      router.refresh();
    } catch (error) {
      setMessage(error?.message || 'Could not update profile photo.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, flexShrink:0 }}>
      <label
        htmlFor="protlys-profile-photo-input"
        aria-label={uploading ? 'Uploading profile photo' : 'Change profile photo'}
        style={{ width:size, height:size, borderRadius:'50%', border:0, padding:0, overflow:'hidden', position:'relative', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--green-soft)', color:'var(--green-dark)', cursor:uploading?'wait':'pointer', flexShrink:0 }}
      >
        {url ? <img src={url} alt="Profile" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <span style={{ fontSize:size*.34, fontWeight:800 }}>{(name || '?')[0].toUpperCase()}</span>}
        <span style={{ position:'absolute', right:0, bottom:0, width:20, height:20, borderRadius:'50%', background:'var(--ink)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #fff', fontSize:11 }}>+</span>
      </label>
      <input id="protlys-profile-photo-input" ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ position:'absolute', width:1, height:1, opacity:0, pointerEvents:'none' }} />
      <label htmlFor="protlys-profile-photo-input" style={{ border:0, background:'none', padding:0, color:'var(--green-dark)', fontSize:10.5, fontWeight:800, cursor:uploading?'wait':'pointer' }}>
        {uploading ? 'Uploading…' : url ? 'Change photo' : 'Add photo'}
      </label>
      {message && <div style={{ fontSize:9.5, color:message.includes('updated') ? 'var(--green-dark)' : '#B3261E', textAlign:'center', maxWidth:100 }}>{message}</div>}
    </div>
  );
}
