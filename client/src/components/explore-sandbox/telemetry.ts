export type SandboxEventName =
  | 'impression'
  | 'viewStart'
  | 'viewProgress'
  | 'viewComplete'
  | 'like'
  | 'save'
  | 'share'
  | 'notInterested'
  | 'ctaClick';

export function logSandboxEvent(eventName: SandboxEventName, payload: Record<string, unknown>) {
  console.log('[explore-sandbox]', eventName, {
    timestamp: new Date().toISOString(),
    ...payload,
  });
}
