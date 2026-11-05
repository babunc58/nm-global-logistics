# NM Global Logistics — Enterprise Platform (LCode-Inspired Architecture)

> **Website:** [http://127.0.0.1:5000/](http://127.0.0.1:5000/)  
> **Admin Control Hub:** [http://127.0.0.1:5000/admin](http://127.0.0.1:5000/admin)  
> **Credentials:** `admin` / `NMLogistics@2024`  

---

## 1. Design Reference & Transport Palette

Inspired by the sleek, dark, high-tech interface of **[LCode Technologies](https://www.lcodetechnologies.com/)** and adapted with relatable heavy transport & logistics visual indicators:
- **Asphalt & Fleet Midnight Navy (`#060d17` / `#0a1526` / `#0f1f38`)**: Ambient highway grid background.
- **High-Visibility Industrial Highway Amber/Orange (`#f26522` / `#ff7a00`)**: Primary accent for safety, heavy cranes, action buttons, and active status indicators.
- **Electric Route Cyan (`#0ea5e9`)**: Telemetry and GPS navigation accent lines.
- **Signal Green (`#10b981`)**: Live 24/7 coordination status badge.

---

## 2. Dynamic Features

### 🎴 A. Service Cards Admin Control
* All service cards on the public page are loaded dynamically from SQLite (`cards` table).
* In **Admin → Service Cards**, you can:
  * **Add New Cards**: Set custom badges (e.g. `04 / FACTORY LOGISTICS`), title, category, description, feature bullets, image URL, and quote button link.
  * **Edit Existing Cards**: Update content, reorder sort indexes, or change images on the fly.
  * **1-Click Visibility Toggle**: Click the eye icon to immediately hide or show any card on the public page.
  * **Delete Cards**: Permanently remove cards with confirmation.

### 🎛️ B. Section Visibility Controls
* In **Admin → Section Visibility**, you have 8 dedicated switches to show or hide entire sections:
  1. `Hero Section` (Top banner & live coordination HUD)
  2. `Services Cards Section` (Dynamic service cards grid)
  3. `4-Step Approach Section` (Process flow)
  4. `Industries Supported Section` (6-sector matrix)
  5. `Coverage & Headquarters Section` (Dindigul network and radar visual)
  6. `Testimonials Section` (Client reviews)
  7. `Quotation Form Section` (Interactive quote generator)
  8. `Contact Channels Section` (Bottom email & inquiry tiles)
* Turning any section OFF hides it from the public DOM and automatically removes its link from the navigation bar.

### 📱 C. Dynamic WhatsApp & Contact Feeds
* In **Admin → Contact & WhatsApp**, you can change:
  * **WhatsApp Number** (updates the floating pulse button and direct links).
  * **Default WhatsApp Message** (pre-populates the client chat).
  * **General Inquiries & Quotation Emails**.
  * **Response Time Commitment** (feeds the hero HUD and quote form).
  * **Registered Office Address**.

### 📋 D. Quotation Management
* Incoming web submissions appear in real-time in **Admin → Quotations**.
* Status workflow (`New`, `In Progress`, `Quoted`, `Closed`, `Cancelled`).
* View detailed cargo weights, dimensions, pickup/drop addresses, and client notes.
* **1-Click WhatsApp Client Reply** (opens WhatsApp chat with client's reference prefilled).
* Export all inquiries to **CSV** for spreadsheet tracking.

---

## 3. Quick Start

### Local Development
```bash
# Clone the repository
git clone <your-repo-url>
cd NM-Logistics

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Start application
npm start
# Server starts at http://localhost:5000
```

---

## 4. Deployment via GitHub

This full-stack application includes an Express backend and an SQLite database layer. You can deploy it directly from GitHub in 2 minutes to any cloud provider:

### Option A: Deploy to Render.com (Recommended Free/Easy Tier)
1. Push this repository to your GitHub account (`https://github.com/<your-username>/nm-logistics`).
2. Log in to [Render.com](https://render.com/) and click **New → Web Service**.
3. Connect your GitHub repository.
4. Set the configuration:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Under **Environment Variables**, add:
   - `ADMIN_USERNAME` = your preferred admin username
   - `ADMIN_PASSWORD` = your preferred admin password
   - `JWT_SECRET` = your random secret string
   - `PORT` = `5000` (or leave default assigned by Render)
6. Click **Deploy Web Service**. Render provides a live HTTPS URL (e.g. `https://nm-logistics.onrender.com`).

### Option B: Deploy to Railway / Koyeb / Fly.io / VPS
1. Connect GitHub repository to [Railway.app](https://railway.app/) or [Koyeb.com](https://koyeb.com/).
2. Set `PORT` and environment variables.
3. Deploy automatically on push!

