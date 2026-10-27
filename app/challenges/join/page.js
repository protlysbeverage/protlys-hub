import JoinClient from './JoinClient';
export default function JoinPage({searchParams}){return <JoinClient initialCode={searchParams?.code||''}/>}