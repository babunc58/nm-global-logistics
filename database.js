/**
 * NM Global Logistics — Database Layer
 * Uses Node.js native SQLite (DatabaseSync from node:sqlite)
 * Zero external compiler dependencies, native speed, persistent on disk
 */

const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'nm-logistics.db');
const db = new DatabaseSync(DB_PATH);

// ── Schema ────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS quotes (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    ref_num        TEXT    NOT NULL UNIQUE,
    service_type   TEXT    NOT NULL,
    name           TEXT    NOT NULL,
    company        TEXT,
    phone          TEXT    NOT NULL,
    whatsapp       INTEGER DEFAULT 1,
    email          TEXT    NOT NULL,
    pickup         TEXT    NOT NULL,
    delivery       TEXT    NOT NULL,
    cargo          TEXT,
    weight         TEXT,
    dimensions     TEXT,
    preferred_date TEXT,
    notes          TEXT,
    status         TEXT    DEFAULT 'new',
    admin_notes    TEXT,
    created_at     TEXT    DEFAULT (datetime('now')),
    updated_at     TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admins (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT NOT NULL UNIQUE,
    password   TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cards (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    badge       TEXT    DEFAULT 'SERVICE',
    title       TEXT    NOT NULL,
    category    TEXT    NOT NULL,
    description TEXT    NOT NULL,
    features    TEXT,
    image_url   TEXT,
    icon        TEXT    DEFAULT 'fa-truck-fast',
    action_text TEXT    DEFAULT 'Request Quote ↗',
    action_link TEXT    DEFAULT '#quote',
    sort_order  INTEGER DEFAULT 0,
    is_active   INTEGER DEFAULT 1,
    created_at  TEXT    DEFAULT (datetime('now')),
    updated_at  TEXT    DEFAULT (datetime('now'))
  );
`);

// ── Seed default settings (including section toggles, theme, contact, and content) ───
const seedSettings = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
const updateEmptySetting = db.prepare(`UPDATE settings SET value = ? WHERE key = ? AND (value IS NULL OR value = '')`);

const defaults = [
  // Contact & Coordinates
  ['phone_number',         '+919443123456'],
  ['phone_display',        '+91 94431 23456'],
  ['alternate_phone',      '+91 98422 67890'],
  ['office_address',       '3/19F, Maran Nagar, Kallimandayam, Dindigul district, Tamil Nadu – 624616, India'],
  ['google_maps_url',      'https://maps.google.com/?q=Kallimandayam+Dindigul+Tamil+Nadu'],
  ['business_hours',       'Mon – Sat: 8:30 AM – 8:30 PM | 24/7 Control Tower Support'],
  ['whatsapp_number',      '919876543210'],
  ['whatsapp_message',     'Hi NM Global Logistics, I need a quote for an industrial logistics/crane requirement.'],
  ['contact_email',        'info@nmgloballogistics.in'],
  ['quotations_email',     'quotations@nmgloballogistics.in'],
  ['response_time',        'within one business day'],
  ['email_notifications_enabled', '1'],
  ['contact_eyebrow',      'DIRECT CONTACT & DISPATCH'],
  ['contact_title',        'Connect with our operations desk.'],
  ['contact_subtitle',     'Reach our logistics coordinators for immediate fleet dispatch, site crane arrangements, or customized freight tenders.'],

  // Branding & Logo
  ['logo_image_url',       ''],
  ['logo_text',            'NM GLOBAL LOGISTICS'],
  ['logo_icon',            'fa-diamond'],

  // Theme & Appearance
  ['theme_preset',         'midnight_asphalt'],
  ['theme_color',          '#f26522'],

  // Section visibility controls (1 = Visible, 0 = Hidden)
  ['section_hero',         '1'],
  ['section_services',     '1'],
  ['section_approach',     '1'],
  ['section_industries',   '1'],
  ['section_coverage',     '1'],
  ['section_testimonials', '1'],
  ['section_quote',        '1'],
  ['section_contact',      '1'],

  // Contact Section Individual Card Toggles (1 = Visible, 0 = Hidden)
  ['contact_card_phone',    '1'],
  ['contact_card_address',  '1'],
  ['contact_card_whatsapp', '1'],
  ['contact_card_quotes',   '1'],
  ['contact_card_general',  '1'],

  // Hero Section Content
  ['hero_badge',           'PRECISION INDUSTRIAL LOGISTICS & MOBILE CRANE FLEET'],
  ['hero_title',           'Precision Heavy Logistics & Mobile Crane Solutions.'],
  ['hero_desc',            'Full truckload transport, specialized over-dimensional cargo movements, and mobile crane arrangements engineered for industrial projects across India.'],
  ['hero_stat1_num',       '500+'],
  ['hero_stat1_label',     'Verified Fleet Vehicles'],
  ['hero_stat2_num',       '99.4%'],
  ['hero_stat2_label',     'On-Time Dispatch Rate'],
  ['hero_stat3_num',       '24/7'],
  ['hero_stat3_label',     'Control Tower Support'],

  // Approach (4 Steps) Section Content
  ['approach_step1_title', 'Requirement & Parameter Analysis'],
  ['approach_step1_desc',  'We review dimensions, tonnages, origin route constraints and schedule commitments upfront.'],
  ['approach_step2_title', 'Asset Match & Route Survey'],
  ['approach_step2_desc',  'Selecting the right trailer configuration or crane capacity with corridor permits verified.'],
  ['approach_step3_title', 'Active Transit Coordination'],
  ['approach_step3_desc',  'Constant GPS tracking, driver liaison, and milestone updates directly to your logistics desk.'],
  ['approach_step4_title', 'POD & Delivery Confirmation'],
  ['approach_step4_desc',  'Safe site offloading, uncoupling confirmation, and swift Proof of Delivery documentation.'],

  // Coverage Section Content
  ['coverage_title',        'Headquartered in Tamil Nadu. Coordinating Nationwide.'],
  ['coverage_desc',         'Based at Dindigul, Tamil Nadu, we support strategic industrial clusters across the Southern peninsula and coordinate interstate logistics subject to route permits and equipment availability.'],
  ['coverage_network_text', 'Industrial routes surveyed across Tamil Nadu, Karnataka, Andhra Pradesh, Maharashtra, Gujarat and Central corridors.'],

  // Industries Section (JSON)
  ['industries_json', JSON.stringify([
    {"icon":"fa-car","name":"Automotive & Auto Ancillary","desc":"Assembly line components, chassis frames, engine castings, stamping tooling."},
    {"icon":"fa-industry","name":"Heavy Engineering & Machinery","desc":"Boilers, pressure vessels, machine tools, structural steel fabrications."},
    {"icon":"fa-solar-panel","name":"Renewable Energy & Power","desc":"Wind turbine components, solar panels, high-voltage transformers, substations."},
    {"icon":"fa-building","name":"EPC, Infrastructure & Cement","desc":"Pre-cast concrete girders, construction batching plants, earthmoving cranes."},
    {"icon":"fa-boxes-packing","name":"FMCG, Retail & Consumer Goods","desc":"Palletised bulk packaging, factory-to-distribution center scheduled freight."},
    {"icon":"fa-flask","name":"Chemicals & Raw Materials","desc":"Specialized intermediate bulk containers, raw mineral loads, bagged dry chemicals."}
  ])],

  // Testimonials Section (JSON)
  ['testimonials_json', JSON.stringify([
    {"stars": 5, "quote": "NM Global handled our ODC transformer movement from Chennai to Coimbatore seamlessly. Route permits, escorts — everything was coordinated without us having to follow up.", "name": "Rajesh Sundaram", "company": "Operations Manager, Power Infra Ltd."},
    {"stars": 5, "quote": "We needed a mobile crane at short notice for a factory installation. They arranged the right capacity equipment within 48 hours. Single point of contact made it very easy.", "name": "Karthik Nair", "company": "Projects Director, Steel Fab Solutions"},
    {"stars": 5, "quote": "Reliable, responsive and transparent. We've been using them for monthly factory-to-warehouse dispatches across Tamil Nadu. No surprises, just delivery.", "name": "Priya Venkataraman", "company": "Logistics Head, Industrial Parts Pvt. Ltd."}
  ])]
];

defaults.forEach(([k, v]) => {
  seedSettings.run(k, v);
});

// If phone_display or office_address was seeded previously as empty, populate it with valid defaults
updateEmptySetting.run('+91 94431 23456', 'phone_display');
updateEmptySetting.run('+919443123456', 'phone_number');
updateEmptySetting.run('3/19F, Maran Nagar, Kallimandayam, Dindigul district, Tamil Nadu – 624616, India', 'office_address');

// ── Seed default service cards if table is empty ──────────────────────────────
const existingCardCount = db.prepare('SELECT COUNT(*) as count FROM cards').get().count;
if (existingCardCount === 0) {
  const insertInitialCard = db.prepare(`
    INSERT INTO cards (badge, title, category, description, features, image_url, icon, action_text, action_link, sort_order, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialCards = [
    [
      '01 / TRANSPORT',
      'Domestic Transportation',
      'Full & Part Truck Load',
      'Arrangements for routine goods movement, industrial cargo, heavy machinery and plant equipment.',
      'Full Truck Load & Part Truck Load (FTL/PTL)\nFactory-to-factory & warehouse movement\nPickup, delivery & shipment progress coordination',
      'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&q=80',
      'fa-truck-moving',
      'Plan Cargo Movement ↗',
      '#quote',
      1,
      1
    ],
    [
      '02 / SPECIALISED CARGO',
      'ODC & Project Cargo',
      'Heavy & Over-Dimensional',
      'Coordination for over-dimensional loads, structural components and heavy materials across India.',
      'Vehicle & multi-axle hydraulic trailer planning\nRoute survey, escort & permission assistance\nLoading, securing & delivery schedule coordination',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
      'fa-trailer',
      'Discuss ODC Requirement ↗',
      '#quote',
      2,
      1
    ],
    [
      '03 / LIFTING SUPPORT',
      'Mobile Crane Arrangements',
      'Industrial & Site Lifting',
      'Crane deployment for industrial erection, construction works and project sites subject to equipment suitability.',
      'Machinery lifting, shifting & positioning\nHeavy-material & structural steel lifting\nShort-term & long-term project crane hire',
      'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&q=80',
      'fa-crane',
      'Discuss Lifting Requirement ↗',
      '#quote',
      3,
      1
    ]
  ];

  initialCards.forEach(c => insertInitialCard.run(...c));
  console.log('[DB] Seeded initial service cards.');
}

// ── Seed admin user ──────────────────────────────────────────────────────────
function seedAdmin() {
  const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(
    process.env.ADMIN_USERNAME || 'admin'
  );
  if (!existing) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'NMLogistics@2024', 12);
    db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run(
      process.env.ADMIN_USERNAME || 'admin', hash
    );
    console.log('[DB] Admin user created:', process.env.ADMIN_USERNAME || 'admin');
  }
}
seedAdmin();

// ── Helper queries ────────────────────────────────────────────────────────────
const Queries = {
  // Settings
  getSetting: db.prepare('SELECT value FROM settings WHERE key = ?'),
  getAllSettings: db.prepare('SELECT key, value FROM settings ORDER BY key'),
  upsertSetting: db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `),

  // Quotes
  insertQuote: db.prepare(`
    INSERT INTO quotes (
      ref_num, service_type, name, company, phone, whatsapp,
      email, pickup, delivery, cargo, weight, dimensions, preferred_date, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getQuotes: db.prepare(`SELECT * FROM quotes ORDER BY id DESC`),
  getQuotesByStatus: db.prepare(`SELECT * FROM quotes WHERE status = ? ORDER BY id DESC`),
  getQuote: db.prepare('SELECT * FROM quotes WHERE id = ?'),
  getQuoteByRef: db.prepare('SELECT * FROM quotes WHERE ref_num = ?'),
  updateQuoteStatus: db.prepare(`
    UPDATE quotes SET status = ?, admin_notes = ?, updated_at = datetime('now') WHERE id = ?
  `),
  countByStatus: db.prepare(`SELECT status, COUNT(*) as count FROM quotes GROUP BY status`),

  // Cards management
  getActiveCards: db.prepare('SELECT * FROM cards WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'),
  getAllCards: db.prepare('SELECT * FROM cards ORDER BY sort_order ASC, id ASC'),
  getCard: db.prepare('SELECT * FROM cards WHERE id = ?'),
  insertCard: db.prepare(`
    INSERT INTO cards (badge, title, category, description, features, image_url, icon, action_text, action_link, sort_order, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updateCard: db.prepare(`
    UPDATE cards SET
      badge = ?, title = ?, category = ?, description = ?, features = ?,
      image_url = ?, icon = ?, action_text = ?, action_link = ?, sort_order = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `),
  toggleCardActive: db.prepare(`
    UPDATE cards SET is_active = ?, updated_at = datetime('now') WHERE id = ?
  `),
  deleteCard: db.prepare('DELETE FROM cards WHERE id = ?'),

  // Admin auth
  getAdmin: db.prepare('SELECT * FROM admins WHERE username = ?')
};

module.exports = { db, Queries };
