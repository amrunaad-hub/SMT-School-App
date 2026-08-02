const webpush = require('web-push');

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
const configured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (configured) {
  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:admin@smtthane.edu', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn('[webPush] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set — push notifications are disabled.');
}

// Sends to every given subscription row, deleting any that the push service
// reports as gone (410/404 — the browser unsubscribed or the endpoint
// expired) so they stop being retried on every future notice.
async function sendToSubscriptions(db, subscriptions, payload) {
  if (!configured || !subscriptions.length) return;
  const body = JSON.stringify(payload);

  await Promise.all(subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }, body);
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await db('push_subscriptions').where({ id: sub.id }).del();
      } else {
        console.error('[webPush] send failed:', err.message);
      }
    }
  }));
}

module.exports = { configured, sendToSubscriptions, publicKey: VAPID_PUBLIC_KEY };
