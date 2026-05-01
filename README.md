# ⚡ Venus Energy — Project Management System

A production-ready Next.js 14 + Supabase project management system for telecom infrastructure operations.

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone <your-repo>
cd venus-energy-pms
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy your **Project URL** and **Anon Key** from Settings → API
3. Copy your **Service Role Key** (keep this secret!)
4. Go to **SQL Editor** → paste the contents of `supabase/schema.sql` → Run

### 3. Configure Environment Variables
```bash
cp .env.local.example .env.local
```
Fill in your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Create Your First Super Admin
1. Go to Supabase Dashboard → Authentication → Users → Invite User
2. Enter your email and send invite
3. Click the link in the email and set your password
4. In SQL Editor, run:
```sql
update public.profiles
set role = 'super_admin'
where email = 'your-email@domain.com';
```

### 5. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## 🌐 Deploy to Vercel

### Option A — Vercel CLI
```bash
npm i -g vercel
vercel --prod
```

### Option B — GitHub Integration
1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` → `https://your-app.vercel.app`
4. Deploy!

### Supabase Auth Redirect URL
In Supabase Dashboard → Authentication → URL Configuration:
- Add `https://your-app.vercel.app/auth/callback` to **Redirect URLs**
- Set **Site URL** to `https://your-app.vercel.app`

---

## 📁 Project Structure

```
venus-energy-pms/
├── context/
│   └── AuthContext.tsx          # Auth state, permissions
├── components/
│   ├── Layout.tsx               # App shell
│   ├── Sidebar.tsx              # Navigation (role-aware)
│   └── Header.tsx               # Top bar + user menu
├── lib/
│   ├── supabase.ts              # Client-side Supabase
│   ├── supabaseAdmin.ts         # Server-side admin client
│   ├── permissions.ts           # Default permission matrix
│   └── theme.ts                 # Design tokens + style helpers
├── pages/
│   ├── login.tsx                # Sign in page
│   ├── dashboard.tsx            # Main dashboard
│   ├── projects.tsx             # Project management
│   ├── vendors.tsx              # Vendor management
│   ├── billing.tsx              # Billing & invoices
│   ├── profile.tsx              # User profile settings
│   ├── admin/
│   │   ├── users.tsx            # User management (Super Admin)
│   │   └── roles.tsx            # Role permissions (Super Admin)
│   └── api/admin/
│       ├── invite-user.ts       # Send invite email
│       ├── create-user.ts       # Create with password
│       └── update-user.ts       # Edit user details
├── supabase/
│   └── schema.sql               # Full DB schema + seed data
├── types/
│   └── index.ts                 # TypeScript types
├── styles/
│   └── globals.css              # Global styles
└── middleware.ts                # Route protection
```

---

## 👥 Roles & Access

| Role             | Description                          |
|------------------|--------------------------------------|
| Super Admin      | Full access to everything            |
| Region Manager   | Manages their region's projects      |
| Project Manager  | Manages assigned projects            |
| Site Engineer    | Updates work status, attendance      |
| Viewer           | Read-only access to all modules      |

> Super Admin can customize each role's permissions from **Admin → Role & Permissions**

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (Pages Router)
- **Auth + DB**: Supabase (PostgreSQL + GoTrue)
- **Styling**: Inline styles with teal design system
- **Charts**: Recharts
- **Deployment**: Vercel

---

## 🔒 Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` is only used server-side in API routes — never exposed to client
- Row Level Security (RLS) is enabled on all tables
- Middleware protects all routes — unauthenticated users are redirected to `/login`
- Admin API routes verify the caller's role server-side before executing

---

## 📞 Support

Venus Energy Pvt. Ltd. · Telecom Infrastructure Management  
Built with ❤️ for efficient project control.
