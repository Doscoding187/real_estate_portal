import { parseArgs } from 'node:util';
import { inspectLaunchWorker } from './launchWorkerAdmissionCheck';

try {
  const { values } = parseArgs({
    options: {
      sha: { type: 'string' },
      fingerprint: { type: 'string' },
      'project-id': { type: 'string' },
      'environment-id': { type: 'string' },
      'service-id': { type: 'string' },
      'expires-at': { type: 'string' },
    },
  });
  const result = await inspectLaunchWorker({
    sha: values.sha ?? '',
    fingerprint: values.fingerprint ?? '',
    projectId: values['project-id'] ?? '',
    environmentId: values['environment-id'] ?? '',
    serviceId: values['service-id'] ?? '',
    expiresAt: values['expires-at'] ?? '',
  });
  console.log(JSON.stringify(result));
} catch {
  // Driver errors can contain SQL, addresses or credentials. Keep failure output bounded.
  console.error(
    JSON.stringify({
      kind: 'launch-worker-admission',
      ok: false,
      error: 'admission-refused-or-read-failed',
      deliveryAuthorized: false,
    }),
  );
  process.exitCode = 2;
}
