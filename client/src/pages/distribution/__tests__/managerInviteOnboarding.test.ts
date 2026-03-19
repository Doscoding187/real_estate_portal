import { describe, expect, it } from 'vitest';
import { parseDistributionManagerInviteParams } from '../../../../../shared/distributionManagerInvite';
import {
  getManagerInviteStateCopy,
  resolveManagerInvitePresentationState,
} from '../managerInviteOnboarding';

describe('manager invite onboarding helpers', () => {
  it('recovers the latest invite params from a malformed concatenated link', () => {
    const parsed = parseDistributionManagerInviteParams(
      '?registrationId=1&email=propertylistifysa%40gmail.com/distribution/manager/onboarding?registrationId=27&email=manager%40example.com',
    );

    expect(parsed).toEqual({
      token: '',
      registrationId: 27,
      email: 'manager@example.com',
      isComplete: true,
      recovered: true,
    });
  });

  it('accepts token-based invite links as complete', () => {
    const parsed = parseDistributionManagerInviteParams('?token=signed.invite.token');

    expect(parsed).toEqual({
      token: 'signed.invite.token',
      registrationId: null,
      email: '',
      isComplete: true,
      recovered: false,
    });
  });

  it('maps approved invites to the accepted state', () => {
    expect(
      resolveManagerInvitePresentationState({
        hasInviteParams: true,
        isLoading: false,
        status: 'approved',
        canComplete: false,
      }),
    ).toBe('accepted');
  });

  it('returns clear copy for invalid invites', () => {
    expect(getManagerInviteStateCopy('invalid', 'rejected')).toEqual({
      title: 'Invite unavailable',
      description: 'This invite is rejected and can no longer be used.',
    });
  });
});
