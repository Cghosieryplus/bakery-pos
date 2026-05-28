# 🥯 Crumb & Culture — Bakery POS

React + Vite app deployed on Vercel, with Supabase as the database.

---

## Stack
- **React 18 + Vite** — frontend
- **Supabase** — Postgres database (replaces localStorage)
- **Vercel** — hosting + CI/CD

---

## Deploy in 4 steps

### 1. Create a Supabase project
1. Go to https://supabase.com and create a free account
2. Create a new project (pick any region)
3. Go to **SQL Editor** and paste + run the contents of `supabase/schema.sql`
4. Go to **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / public key** → `VITE_SUPABASE_ANON_KEY`

### 2. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/crumb-and-culture.git
git push -u origin main
```

### 3. Deploy on Vercel
1. Go to https://vercel.com and sign in with GitHub
2. Click **Add New Project** → import your repo
3. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
4. Click **Deploy** — done! Vercel auto-deploys on every push to `main`

### 4. Local development
```bash
cp .env.example .env
# Fill in your Supabase values in .env
npm install
npm run dev
```

---

## Menu
| Item | Price | Category |
|------|-------|----------|
| Big Regular Challah | $18.00 | Big |
| Big Sesame Challah | $18.00 | Big |
| Small Regular Challah | $10.00 | Small |
| Small Sesame Challah | $10.00 | Small |
| Chummus | $5.99 | Sides (½ lb) |
| Techina | $5.99 | Sides (½ lb) |

---

## New Chat Prompt

Use this to continue development in a new Claude chat:

```
I have a Bakery POS app called "Crumb & Culture" deployed on Vercel with Supabase as the database. Here's the full context:

**App features:**
- Place orders (challah + sides), track payment status (unpaid / partial / paid in full / exempt)
- Mark orders as picked up
- Stock inventory management per item
- Bake list — automatically tracks what needs to be made when stock runs out
- Weekly sales report with charity fund tracker (10% of revenue donated)

**Menu:**
- Big Regular Challah — $18
- Big Sesame Challah — $18
- Small Regular Challah — $10
- Small Sesame Challah — $10
- Chummus (½ lb) — $5.99
- Techina (½ lb) — $5.99

**Stack:**
- React 18 + Vite (no component library, all inline styles)
- Supabase (single table `app_state`, JSONB column `data`, stores entire app state)
- Vercel for hosting
- src/supabase.js handles loadState() / saveState() with 800ms debounce

**Files:**
- src/App.jsx — full app
- src/supabase.js — Supabase client + load/save helpers
- supabase/schema.sql — DB schema
- vercel.json — SPA rewrites

Here is my current App.jsx: [PASTE YOUR App.jsx HERE]

I want to: [DESCRIBE WHAT YOU WANT TO CHANGE]
```
```

---

## Project structure
```
bakery-pos/
├── src/
│   ├── App.jsx          # Full app component
│   ├── supabase.js      # DB client + helpers
│   └── main.jsx         # React entry point
├── supabase/
│   └── schema.sql       # Run this in Supabase SQL editor
├── index.html
├── vite.config.js
├── package.json
├── vercel.json
├── .env.example
└── .gitignore
```
