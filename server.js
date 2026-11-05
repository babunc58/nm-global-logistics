/**
 * NM Global Logistics — Express Server
 */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const apiRoutes   = require('./routes/api');
const adminRoutes = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static files ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);
app.use('/admin/api', adminRoutes);

// ── Admin SPA fallback ────────────────────────────────────────────────────────
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'NM Global Logistics', version: '1.0.0' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`\n[+] NM Global Logistics server running at: http://localhost:${PORT}`);
  console.log(`[+] Admin panel: http://localhost:${PORT}/admin`);
  console.log(`[+] Website:     http://localhost:${PORT}/\n`);
});

