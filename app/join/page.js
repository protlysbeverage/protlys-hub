import ReferralJoinClient from './ReferralJoinClient';

export default async function ReferralJoinPage({ searchParams }) {
  const params = await searchParams;
  const code = typeof params?.ref === 'string' ? params.ref : '';
  return <ReferralJoinClient code={code} />;
}
