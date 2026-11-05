/**
 * NM Global Logistics — Admin API Routes
 * All routes require JWT authentication except POST /admin/api/login
 */

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { Queries } = require('../database');

const JWT_SECRET  = process.env.JWT_SECRET || 'nm-secret-change-this';
const JWT_EXPIRES = '8h';

// ── Middleware: verify JWT ────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  let token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }
  if (!token) return res.status(401).json({ ok: false, error: 'Unauthorised' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ ok: false, error: 'Invalid or expired token' });
  }
}

// ── POST /admin/api/login ─────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'Username and password required' });
  }

  const admin = Queries.getAdmin.get(username);
  if (!admin || !bcrypt.compareSync(password, admin.password)) {
    return res.status(401).json({ ok: false, error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  console.log(`[ADMIN] Login success: ${username}`);
  res.json({ ok: true, token, username: admin.username });
});

// ── QUOTES MANAGEMENT ─────────────────────────────────────────────────────────

// GET /admin/api/quotes
router.get('/quotes', requireAuth, (req, res) => {
  try {
    const { status, search } = req.query;
    let quotes = status ? Queries.getQuotesByStatus.all(status) : Queries.getQuotes.all();

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      quotes = quotes.filter(r =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.company || '').toLowerCase().includes(q) ||
        (r.email || '').toLowerCase().includes(q) ||
        (r.phone || '').includes(q) ||
        (r.ref_num || '').toLowerCase().includes(q) ||
        (r.pickup || '').toLowerCase().includes(q) ||
        (r.delivery || '').toLowerCase().includes(q)
      );
    }

    res.json({ ok: true, quotes, total: quotes.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /admin/api/quotes/:id
router.get('/quotes/:id', requireAuth, (req, res) => {
  const quote = Queries.getQuote.get(parseInt(req.params.id));
  if (!quote) return res.status(404).json({ ok: false, error: 'Quote not found' });
  res.json({ ok: true, quote });
});

// PATCH /admin/api/quotes/:id
router.patch('/quotes/:id', requireAuth, (req, res) => {
  const { status, admin_notes } = req.body || {};
  const VALID_STATUSES = ['new', 'in_progress', 'quoted', 'closed', 'cancelled'];
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ ok: false, error: 'Invalid status' });
  }
  const existing = Queries.getQuote.get(parseInt(req.params.id));
  if (!existing) return res.status(404).json({ ok: false, error: 'Quote not found' });

  Queries.updateQuoteStatus.run(
    status || existing.status,
    admin_notes !== undefined ? admin_notes : existing.admin_notes,
    existing.id
  );
  res.json({ ok: true, message: 'Updated' });
});

// GET /admin/api/export/csv
router.get('/export/csv', requireAuth, (req, res) => {
  const quotes = Queries.getQuotes.all();
  const headers = [
    'Ref#','Date','Status','Name','Company','Phone','WhatsApp','Email',
    'Service','Pickup','Delivery','Cargo','Weight','Dimensions','Preferred Date','Notes','Admin Notes'
  ];
  const rows = quotes.map(q => [
    q.ref_num, q.created_at, q.status,
    q.name, q.company || '', q.phone, q.whatsapp ? 'Yes' : 'No', q.email,
    q.service_type, q.pickup, q.delivery,
    q.cargo || '', q.weight || '', q.dimensions || '',
    q.preferred_date || '', q.notes || '', q.admin_notes || ''
  ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="nm-quotes-${Date.now()}.csv"`);
  res.send(csv);
});

// GET /admin/api/stats
router.get('/stats', requireAuth, (req, res) => {
  const counts = Queries.countByStatus.all();
  const stats  = { new: 0, in_progress: 0, quoted: 0, closed: 0, cancelled: 0, total: 0 };
  counts.forEach(r => { stats[r.status] = r.count; stats.total += r.count; });
  res.json({ ok: true, stats });
});

// ── CARDS MANAGEMENT (SERVICES & FEATURES) ───────────────────────────────────

// GET /admin/api/cards
router.get('/cards', requireAuth, (req, res) => {
  try {
    const cards = Queries.getAllCards.all();
    res.json({ ok: true, cards });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /admin/api/cards
router.post('/cards', requireAuth, (req, res) => {
  try {
    const {
      badge = 'SERVICE',
      title,
      category = 'Logistics Service',
      description,
      features = '',
      image_url = '',
      icon = 'fa-truck-fast',
      action_text = 'Request Quote ↗',
      action_link = '#quote',
      sort_order = 0,
      is_active = 1
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ ok: false, error: 'Title and description are required' });
    }

    Queries.insertCard.run(
      badge.trim(),
      title.trim(),
      category.trim(),
      description.trim(),
      features.trim(),
      image_url.trim(),
      icon.trim(),
      action_text.trim(),
      action_link.trim(),
      parseInt(sort_order) || 0,
      is_active ? 1 : 0
    );

    res.json({ ok: true, message: 'Card created successfully' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /admin/api/cards/:id
router.put('/cards/:id', requireAuth, (req, res) => {
  try {
    const cardId = parseInt(req.params.id);
    const existing = Queries.getCard.get(cardId);
    if (!existing) return res.status(404).json({ ok: false, error: 'Card not found' });

    const {
      badge = existing.badge,
      title = existing.title,
      category = existing.category,
      description = existing.description,
      features = existing.features,
      image_url = existing.image_url,
      icon = existing.icon,
      action_text = existing.action_text,
      action_link = existing.action_link,
      sort_order = existing.sort_order,
      is_active = existing.is_active
    } = req.body;

    Queries.updateCard.run(
      badge,
      title,
      category,
      description,
      features,
      image_url,
      icon,
      action_text,
      action_link,
      parseInt(sort_order) || 0,
      is_active ? 1 : 0,
      cardId
    );

    res.json({ ok: true, message: 'Card updated successfully' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// PATCH /admin/api/cards/:id/toggle
router.patch('/cards/:id/toggle', requireAuth, (req, res) => {
  try {
    const cardId = parseInt(req.params.id);
    const existing = Queries.getCard.get(cardId);
    if (!existing) return res.status(404).json({ ok: false, error: 'Card not found' });

    const newStatus = existing.is_active ? 0 : 1;
    Queries.toggleCardActive.run(newStatus, cardId);
    res.json({ ok: true, message: `Card is now ${newStatus ? 'Active' : 'Hidden'}`, is_active: newStatus });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /admin/api/cards/:id
router.delete('/cards/:id', requireAuth, (req, res) => {
  try {
    const cardId = parseInt(req.params.id);
    Queries.deleteCard.run(cardId);
    res.json({ ok: true, message: 'Card deleted successfully' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── SETTINGS & SECTIONS MANAGEMENT ───────────────────────────────────────────

// GET /admin/api/settings
router.get('/settings', requireAuth, (req, res) => {
  const rows = Queries.getAllSettings.all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  res.json({ ok: true, settings });
});

// PUT /admin/api/settings
router.put('/settings', requireAuth, (req, res) => {
  const allowed = [
    // Contact & Coordinates & Header
    'phone_number', 'phone_display', 'alternate_phone', 'office_address',
    'google_maps_url', 'business_hours', 'whatsapp_number', 'whatsapp_message',
    'contact_email', 'quotations_email', 'response_time', 'email_notifications_enabled',
    'contact_eyebrow', 'contact_title', 'contact_subtitle',

    // Theme & Styling & Branding
    'theme_preset', 'theme_color', 'logo_image_url', 'logo_text', 'logo_icon',

    // Section visibility controls
    'section_hero', 'section_services', 'section_approach', 'section_industries',
    'section_coverage', 'section_testimonials', 'section_quote', 'section_contact',
    'contact_card_phone', 'contact_card_address', 'contact_card_whatsapp', 'contact_card_quotes', 'contact_card_general',

    // Hero Section Content
    'hero_badge', 'hero_title', 'hero_desc',
    'hero_stat1_num', 'hero_stat1_label',
    'hero_stat2_num', 'hero_stat2_label',
    'hero_stat3_num', 'hero_stat3_label',

    // Approach (4 Steps) Section Content
    'approach_step1_title', 'approach_step1_desc',
    'approach_step2_title', 'approach_step2_desc',
    'approach_step3_title', 'approach_step3_desc',
    'approach_step4_title', 'approach_step4_desc',

    // Coverage Section Content
    'coverage_title', 'coverage_desc', 'coverage_network_text',

    // Dynamic Lists (JSON)
    'industries_json', 'testimonials_json'
  ];
  try {
    const updates = req.body || {};
    allowed.forEach(key => {
      if (updates[key] !== undefined) {
        Queries.upsertSetting.run(key, String(updates[key]));
      }
    });
    console.log('[ADMIN] Settings, theme & sections updated by', req.admin.username);
    res.json({ ok: true, message: 'Settings saved' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
