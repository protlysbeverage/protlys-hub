import NewChallengeClient from './NewChallengeClient';
export default function NewChallengePage({searchParams}){return <NewChallengeClient groupId={searchParams?.group||null}/>}