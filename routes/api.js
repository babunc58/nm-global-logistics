/**
 * NM Global Logistics — Public API Routes
 * GET  /api/settings  — returns public config, section toggles & active cards
 * GET  /api/cards     — returns active service cards
 * POST /api/quote     — submit a quotation request
 */

const express = require('express');
const router = express.Router();
const { Queries } = require('../database');

// ── GET /api/settings ────────────────────────────────────────────────────────
router.get('/settings', (req, res) => {
  try {
    const all = Queries.getAllSettings.all();
    const pub = {};
    all.forEach(({ key, value }) => {
      // Exclude any internal sensitive flags if ever added
      if (!key.startsWith('internal_')) {
        pub[key] = value;
      }
    });

    // Also include active cards
    const cards = Queries.getActiveCards.all();

    res.json({ ok: true, settings: pub, cards });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Failed to load settings' });
  }
});

// ── GET /api/cards ────────────────────────────────────────────────────────────
router.get('/cards', (req, res) => {
  try {
    const cards = Queries.getActiveCards.all();
    res.json({ ok: true, cards });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Failed to load service cards' });
  }
});

// ── POST /api/quote ───────────────────────────────────────────────────────────
router.post('/quote', (req, res) => {
  const {
    service_type, name, company, phone, whatsapp,
    email, pickup, delivery, cargo, weight, dimensions, preferred_date, notes
  } = req.body;

  // Validate required fields
  const missing = [];
  if (!service_type) missing.push('service_type');
  if (!name?.trim()) missing.push('name');
  if (!phone?.trim()) missing.push('phone');
  if (!email?.trim()) missing.push('email');
  if (!pickup?.trim()) missing.push('pickup');
  if (!delivery?.trim()) missing.push('delivery');

  if (missing.length) {
    return res.status(400).json({ ok: false, error: 'Required fields missing', fields: missing });
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Invalid email address' });
  }

  // Generate reference number: NM-YYYYMMDD-XXXX
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  const refNum = `NM-${date}-${rand}`;

  try {
    Queries.insertQuote.run(
      refNum,
      service_type,
      name.trim(),
      (company || '').trim(),
      phone.trim(),
      whatsapp ? 1 : 0,
      email.trim().toLowerCase(),
      pickup.trim(),
      delivery.trim(),
      (cargo || '').trim(),
      (weight || '').trim(),
      (dimensions || '').trim(),
      (preferred_date || '').trim(),
      (notes || '').trim()
    );

    console.log(`[QUOTE] New request saved: ${refNum} from ${name} (${email})`);

    const settingResp = Queries.getSetting.get('response_time');
    const responseTime = settingResp ? settingResp.value : 'within one business day';

    res.json({
      ok: true,
      ref_num: refNum,
      message: 'Your quotation request has been received. We will respond ' + responseTime + '.'
    });
  } catch (err) {
    console.error('[QUOTE] Insert error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to save your request. Please try again.' });
  }
});

module.exports = router;
