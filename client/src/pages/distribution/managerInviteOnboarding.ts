export type ManagerInvitePresentationState = 'invalid' | 'loading' | 'ready' | 'accepted';

type ResolveManagerInvitePresentationStateInput = {
  hasInviteParams: boolean;
  isLoading: boolean;
  errorMessage?: string | null;
  status?: string | null;
  canComplete?: boolean | null;
};

export function resolveManagerInvitePresentationState(
  input: ResolveManagerInvitePresentationStateInput,
): ManagerInvitePresentationState {
  if (!input.hasInviteParams) return 'invalid';
  if (input.isLoading) return 'loading';
  if (input.errorMessage) return 'invalid';
  if (input.canComplete) return 'ready';
  if (input.status === 'approved') return 'accepted';
  return 'invalid';
}

export function getManagerInviteStateCopy(
  state: ManagerInvitePresentationState,
  status?: string | null,
) {
  switch (state) {
    case 'loading':
      return {
        title: 'Checking your invite',
        description: 'We are validating this manager invite and loading your onboarding details.',
      };
    case 'ready':
      return {
        title: 'Accept manager invite',
        description:
          'Your invite is valid. Complete your profile and password below to activate manager access.',
      };
    case 'accepted':
      return {
        title: 'Invite already accepted',
        description:
          'This invite has already been accepted. Sign in to continue to the manager dashboard.',
      };
    default:
      return {
        title: 'Invite unavailable',
        description:
          status && status !== 'pending'
            ? `This invite is ${status} and can no longer be used.`
            : 'This invite link is invalid, incomplete, or no longer active.',
      };
  }
}
