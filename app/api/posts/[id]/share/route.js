import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic='force-dynamic';
export const revalidate=0;

export async function GET(_request,{params}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:post,error:postError}=await supabase
    .from('feed_posts')
    .select('id,user_id,body,image_url,post_type,stats,created_at,profiles(display_name,avatar_url),feed_likes(count),feed_comments(count)')
    .eq('id',id).maybeSingle();
  if(postError)return NextResponse.json({error:postError.message},{status:500});
  if(!post)return NextResponse.json({error:'Post not found'},{status:404});
  const {data:comments,error:commentError}=await supabase
    .from('feed_comments')
    .select('id,post_id,user_id,parent_comment_id,body,created_at,profiles(display_name,avatar_url)')
    .eq('post_id',id).order('created_at',{ascending:true});
  if(commentError)return NextResponse.json({error:commentError.message},{status:500});
  return NextResponse.json({
    post:{
      ...post,
      like_count:post.feed_likes?.[0]?.count||0,
      comment_count:post.feed_comments?.[0]?.count||0,
    },
    comments:comments||[],
  },{headers:{'Cache-Control':'public, max-age=30, s-maxage=30, stale-while-revalidate=300'}});
}
