import { Redirect } from 'wouter';

/** Keep old agent referral links pointing to the canonical Distribution workspace. */
export default function AgentReferrals() {
  return <Redirect to="/distribution/partner/overview" />;
}
