# 🚀 Hostinger Node.js Deployment Guide — Jewel AI Studio (v2)

This guide walks you through the step-by-step process of deploying **Jewel AI Studio (v2)** to your Hostinger Node.js application hosting.

---

## 🛠️ Production Readiness Accomplished

The codebase has been verified and upgraded to meet strict production standards:
1. **Routing Fix:** Updated the Express catch-all router (`backend/src/index.ts`) from non-standard `/{*path}` to standard `*` routing, ensuring all deep client links (like `/admin` and `/history`) load robustly.
2. **Performance static serve:** Configured Express static serving with `{ extensions: ['html'] }` so that statically compiled Next.js routes (`admin.html`, `history.html`) serve instantly without routing delays.
3. **Database Integrity:** Configured `backend/.gitignore` to ignore SQLite database outputs (`*.db`, `*.db-journal`, etc.), guaranteeing your local sandbox DB never overwrites active production data on subsequent git deployments.
4. **Media Protection:** Git-ignored the `backend/uploads/` directory, preventing customer uploads from bloating your version control history or getting wiped out.
5. **Local Pre-compilation Verified:** Successfully compiled both backend (`tsc`) and frontend (`next build`) locally, ensuring no out-of-memory errors on Hostinger's memory-restricted servers.

---

## 📋 Step-by-Step Deployment Walkthrough

### Step 1: Pre-Compile Locally
Since Hostinger has memory/CPU caps that can crash a Next.js build process, compile both apps locally on your machine first. Run from the root directory:
```bash
npm run build:local
```
This builds:
* Frontend static output inside `frontend/out/`
* Backend JavaScript assets inside `backend/dist/`

---

### Step 2: Push Compiled Files to GitHub
Make sure your compiled folders (`backend/dist` and `frontend/out`) are pushed to your Git repository. 
> [!NOTE]
> `frontend/out` is ignored by default in the sub-project `.gitignore`. To allow it to be committed and deployed to Hostinger, you can force-add it:
> ```bash
> git add -f frontend/out
> git commit -m "chore: compile and stage production builds"
> git push origin main
> ```

---

### Step 3: Set Up the Node.js App in Hostinger
1. Log in to your **Hostinger hPanel**.
2. Navigate to **Websites** ➔ **Manage** ➔ **Node.js App**.
3. Create a new Node.js application:
   * **Node.js Version:** Select **Node.js 18.x** or **20.x** (recommended).
   * **Application Directory:** Set this to your repository root (e.g., `jewel-ai`).
   * **Domain/Subdomain:** Pick the domain where Jewel AI Studio will run.
   * **Application Startup File:** Set this to `server.js` (which is located at the root of the project).
4. Click **Create**.

---

### Step 4: Environment Variables (`.env`)
Under the Node.js App settings in Hostinger, locate the **Environment Variables** section and add the following keys:
* `NODE_ENV`: `production`
* `GEMINI_API_KEY`: *(Your Google Developer Gemini API key)*
* `PORT`: *(Leave empty or let Hostinger set this automatically)*

---

### Step 5: Install Dependencies & Run Database Migrations
1. In the Hostinger Node.js panel, click **Run npm install** or access the terminal and run:
   ```bash
   npm run install:all
   ```
2. During installation, the backend's postinstall script automatically runs:
   ```bash
   prisma generate
   prisma db push --accept-data-loss
   ```
   *This automatically generates the Prisma Client and creates a production-ready, clean SQLite database (`backend/prisma/dev.db`) on Hostinger.*

---

### Step 6: Start the Application
1. Scroll down to the app controller in hPanel and click **Start App** (or **Restart App** if it was already running).
2. Visit your domain. Jewel AI Studio is now running fully live in production!

---

## 🔒 Post-Deployment Security Recommendations
* **Secure Admin Access:** As soon as the app goes live, visit the `/admin` page, verify the metrics dashboard, and configure your preferred defaults.
* **API Key Configuration:** You can safely remove the `GEMINI_API_KEY` from your `.env` file and instead set it inside the secure database through the **API Settings** tab in the `/admin` view. Keys saved here are stored locally in the SQLite database and are shielded from version control.
