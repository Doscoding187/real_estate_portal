import assert from 'node:assert/strict';
import { createOrReadOnboardingState } from '../server/services/onboardingStateCreation';
import type { createAuthorityRehearsalSession } from '../server/_core/databaseAuthority/connectionAuthority';

/** Only the existing bounded catalogue is available; caller owns finally/end cleanup. */
export async function runAzureRehearsalRegression(
  session: Awaited<ReturnType<typeof createAuthorityRehearsalSession>>,
) {
  const passed: string[] = [];
  const run = session.run;
  const rows = async (index: 0 | 1, probe: Parameters<typeof run>[1], slots: number[] = []) =>
    ((await run(index, probe, slots)) as any)[0];
  const reject = async (probe: Parameters<typeof run>[1], slots: number[], errno: number) =>
    assert.rejects(
      () => run(0, probe, slots),
      (e: any) => e.errno === errno,
    );
  assert.equal((await rows(0, 'read.one'))[0].ok, 1);
  assert.equal((await rows(0, 'read.identity'))[0].time_zone, '+00:00');
  passed.push('SELECT1 / UTC');
  await run(0, 'user.insert', [0]);
  await reject('user.insert', [0], 1062);
  await reject('onboarding.insert', [31], 1452);
  await reject('check.reject', [0], 3819);
  passed.push('PK / FK / CHECK rejection');
  const states = await Promise.all(
    ([0, 1] as const).map(index =>
      createOrReadOnboardingState(
        () => run(index, 'onboarding.insert', [0]),
        async () => (await rows(index, 'onboarding.read', [0]))[0],
      ),
    ),
  );
  assert.equal(states[0].user_id, states[1].user_id);
  passed.push('live application onboarding concurrent winner');
  await run(0, 'transaction.begin');
  await run(0, 'onboarding.update', [0]);
  await run(0, 'transaction.savepoint');
  await run(0, 'onboarding.update', [0]);
  await run(0, 'transaction.rollback-savepoint');
  assert.equal((await rows(0, 'onboarding.read', [0]))[0].content_view_count, 1);
  await run(0, 'transaction.rollback');
  assert.equal((await rows(0, 'onboarding.read', [0]))[0].content_view_count, 0);
  await run(0, 'transaction.begin');
  await run(0, 'onboarding.update', [0]);
  await run(0, 'transaction.commit');
  assert.equal((await rows(1, 'onboarding.read', [0]))[0].content_view_count, 1);
  passed.push('commit / rollback / savepoint');
  await run(0, 'transaction.begin');
  await run(0, 'onboarding.lock', [0]);
  let settled = false;
  const waiter = run(1, 'onboarding.update', [0]).finally(() => {
    settled = true;
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 500));
    assert.equal(settled, false);
  } finally {
    await run(0, 'transaction.rollback');
  }
  await waiter;
  assert.equal((await rows(0, 'onboarding.read', [0]))[0].content_view_count, 2);
  passed.push('FOR UPDATE blocks competing writer then releases');
  await run(0, 'topic.insert', [0]);
  await run(0, 'content-topic.insert', [1, 0]);
  await reject('content-topic.insert', [1, 0], 1062);
  await reject('topic.delete', [0], 1451);
  await run(0, 'content-topic.delete', [1, 0]);
  await run(0, 'topic.delete', [0]);
  passed.push('content_topics composite PK / NO ACTION');
  await run(0, 'email.insert', [0, 0]);
  const email = (await rows(0, 'email.read', [0]))[0];
  assert.equal(email.state, 'pending');
  assert.match(email.microseconds, /^\d{6}$/);
  await run(0, 'email.claim', [0]);
  const claimed = (await rows(0, 'email.read', [0]))[0];
  assert.equal(claimed.state, 'claimed');
  assert.equal(claimed.claim_microseconds, '123456');
  await run(0, 'attempt.insert', [0, 0, 0]);
  await reject('attempt.insert', [1, 0, 0], 1062);
  await reject('attempt.insert', [2, 31, 0], 1452);
  await reject('email.delete', [0], 1451);
  await reject('user.delete', [0], 1451);
  await run(0, 'attempt.delete', [0]);
  await run(0, 'email.delete', [0]);
  passed.push('transactional email claims / attempt uniqueness / RESTRICT / timestamp(6)');
  await run(0, 'json.insert', [0]);
  assert.equal((await rows(0, 'json.read', [0]))[0].value, '7');
  await run(0, 'json.delete', [0]);
  assert.deepEqual(
    (await rows(0, 'read.window')).map((r: any) => [r.n, r.row_number_result]),
    [
      [1, 1],
      [2, 2],
    ],
  );
  passed.push('persisted JSON / CTE / window');
  await run(0, 'user.delete', [0]);
  assert.equal((await rows(0, 'onboarding.read', [0])).length, 0);
  passed.push('FK CASCADE / synthetic DELETE lifecycle');
  return passed;
}
