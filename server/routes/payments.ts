import { Router } from 'express';
import {
  recordFailedOnlinePayment,
  settleVerifiedOnlinePayment,
} from '../services/billingFoundationService';
import { verifyPayFastNotification } from '../services/payfastService';

const router = Router();

router.post('/payfast/notify', async (req, res) => {
  try {
    const notification = await verifyPayFastNotification(req.body || {});
    if (!notification.valid) {
      if (notification.verified && notification.paymentId && notification.merchantPaymentId) {
        await recordFailedOnlinePayment({
          provider: 'payfast',
          providerPaymentId: notification.paymentId,
          paymentReference: notification.merchantPaymentId,
          amountMinor: notification.amountMinor,
          currency: notification.currency,
          status: notification.status || 'NOT_COMPLETE',
          metadata: notification.raw,
        });
        res.status(200).send('OK');
        return;
      }
      res.status(400).send(notification.reason || 'Invalid payment notification.');
      return;
    }

    const result = await settleVerifiedOnlinePayment({
      provider: 'payfast',
      providerPaymentId: notification.paymentId,
      paymentReference: notification.merchantPaymentId,
      amountMinor: notification.amountMinor,
      currency: notification.currency,
      metadata: notification.raw,
    });
    res.status(200).send(result.idempotent ? 'OK' : ' received');
  } catch (error) {
    console.error('[Payments] PayFast notification failed', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).send('Payment notification could not be processed.');
  }
});

export default router;
