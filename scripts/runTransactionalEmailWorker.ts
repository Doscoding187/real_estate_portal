import { getWorkerDb, resetDb } from '../server/db-connection';
import { isTransactionalEmailConfigured } from '../server/_core/transactionalEmailConfig';
import { consumeLaunchEmailEvents, runTransactionalEmailWorker, transactionalEmailBacklog } from '../server/services/transactionalEmailDeliveryService';

if (!isTransactionalEmailConfigured()) {
  throw new Error('Transactional email worker requires configured Resend credentials and sender.');
}
const database = await getWorkerDb();
if (!database) throw new Error('Transactional email worker database unavailable.');
try {
  const consumed = await consumeLaunchEmailEvents({ database });
  const delivery = await runTransactionalEmailWorker({ database });
  const backlog = await transactionalEmailBacklog(database);
  const counts = backlog.reduce<Record<string, number>>((acc, row) => {
    acc[row.state] = (acc[row.state] || 0) + 1;
    return acc;
  }, {});
  const stale = backlog.filter(row => row.stale).length;
  console.log(JSON.stringify({ consumed, delivery, backlog: { ...counts, stale } }));
  if (consumed.attention || delivery.unknown || counts.unknown || counts.permanent_failed || stale) {
    process.exitCode = 2;
  }
} finally {
  resetDb();
}
