const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const { configured, publicKey } = require('../utils/webPush');

router.use(auth);

// GET /api/push/vapid-public-key — the client needs this to call
// pushManager.subscribe(); harmless to expose, it's the *public* half.
router.get('/vapid-public-key', (req, res) => {
  if (!configured) return res.status(503).json({ message: 'Push notifications are not configured on this server.' });
  return res.json({ publicKey });
});

// POST /api/push/subscribe — body: the PushSubscription object from
// pushManager.subscribe(). Upserts by endpoint so re-subscribing (e.g. after
// clearing site data) doesn't create duplicate rows.
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

// DELETE /api/push/subscribe — body: { endpoint }. Only removes the
// requesting user's own subscription for that endpoint.
router.delete('/subscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ message: 'endpoint is required.' });
    await db('push_subscriptions').where({ user_id: req.user.id, endpoint }).del();
    return res.json({ message: 'Unsubscribed.' });
  } catch (err) {
    console.error('DELETE /api/push/subscribe error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
