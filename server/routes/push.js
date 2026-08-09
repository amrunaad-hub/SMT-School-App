const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const { configured, publicKey } = require('../utils/webPush');

// DELETE /api/push/subscribe — body: { endpoint }. Deliberately NOT behind
// `auth` (unlike every other route below) — this is the strict-logout
// backstop. A token that's already expired/invalid can't authenticate an
// authenticated request, so if unsubscribe required a valid token, a device
// whose session died (401 from any API call, or a stale/cleared token found
// at app startup with no way to re-validate it) could never remove its own
// push subscription and would keep receiving notices forever. `endpoint` is
// unique per row and only obtainable via this exact device's own
// pushManager.getSubscription() — knowing it already implies device
// possession, so scoping the delete by endpoint alone (no user_id check) is
// safe without requiring auth. See client's App.jsx logout/auth:expired/
// startup-safety-net call sites — all three rely on this being unauthenticated.
router.delete('/subscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ message: 'endpoint is required.' });
    await db('push_subscriptions').where({ endpoint }).del();
    return res.json({ message: 'Unsubscribed.' });
  } catch (err) {
    console.error('DELETE /api/push/subscribe error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.use(auth);

// GET /api/push/vapid-public-key — the client needs this to call
// pushManager.subscribe(); harmless to expose, it's the *public* half.
router.get('/vapid-public-key', (req, res) => {
  if (!configured) return res.status(503).json({ message: 'Push notifications are not configured on this server.' });
  return res.json({ publicKey });
});

// POST /api/push/subscribe — body: the PushSubscription object from
// pushManager.subscribe(). Upserts by endpoint so re-subscribing (e.g. after
// clearing site data) doesn't create duplicate rows. Kept behind `auth` —
// only DELETE needs to work without a valid session.
router.post('/subscribe', async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: 'endpoint and keys.p256dh/keys.auth are required.' });
    }

    await db('push_subscriptions')
      .insert({ user_id: req.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth })
      .onConflict('endpoint').merge(['user_id', 'p256dh', 'auth']);

    return res.status(201).json({ message: 'Subscribed.' });
  } catch (err) {
    console.error('POST /api/push/subscribe error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
