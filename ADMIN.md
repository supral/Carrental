# NB Automotive Admin Dashboard

Full admin panel integrated at `/admin` with Auth.js, Prisma, PostgreSQL, and role-based access control.

## Setup

### 1. PostgreSQL Database

Create a PostgreSQL database and set `DATABASE_URL` in `.env.local`:

```
# Use your PostgreSQL install password. PG 18 on Windows often uses port 5433.
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5433/nb_automotive?schema=public"
AUTH_SECRET="your-random-secret-here"
AUTH_URL="http://localhost:3000"
```

### 2. Migrate & Seed

```bash
cd frontend
npx prisma db push
npm run db:seed
```

### 3. Start Dev Server

```bash
npm run dev
```

Visit **http://localhost:3000/admin**

## Demo Login

| Email | Password | Role |
|-------|----------|------|
| superadmin@nbautomotive.com.au | admin123 | Super Admin |
| admin@nbautomotive.com.au | admin123 | Admin |
| dealer@nbautomotive.com.au | admin123 | Dealer Manager |
| content@nbautomotive.com.au | admin123 | Content Manager |
| support@nbautomotive.com.au | admin123 | Support Agent |

## Admin Routes

| Route | Feature |
|-------|---------|
| `/admin` | Dashboard with stats & Recharts |
| `/admin/vehicles` | Vehicle CRUD, approve, feature, mark sold |
| `/admin/moderation` | Pending listing approval queue |
| `/admin/dealers` | Dealer directory, verify, suspend |
| `/admin/users` | User management, ban/unban |
| `/admin/leads` | Buyer inquiries & lead tracking |
| `/admin/content` | Banners, promotions, blog, FAQs |
| `/admin/media` | Drag-and-drop image upload |
| `/admin/reports` | Export CSV/Excel/PDF |
| `/admin/notifications` | Real-time admin notifications |
| `/admin/audit` | Activity & security audit logs |
| `/admin/settings` | Site, SEO, email, branding |

## Roles & Permissions

- **Super Admin** — Full access
- **Admin** — All except settings management
- **Dealer Manager** — Vehicles, dealers, leads
- **Content Manager** — Content & media only
- **Support Agent** — Leads & user view

## Tech Stack

- Next.js App Router + TypeScript
- Auth.js (NextAuth v5) with credentials
- Prisma ORM + PostgreSQL
- shadcn/ui + Tailwind CSS
- React Query + Zustand
- Recharts for analytics
- TanStack Table for data tables
- next-themes for dark mode

## Database Schema

See `prisma/schema.prisma` for complete models:

- User, Dealer, Vehicle, VehicleImage
- Lead, LeadNote, ModeratorNote
- Banner, Promotion, BlogPost, FAQ, PageContent
- Notification, AuditLog, SiteSetting, Report
- Favorite, SavedSearch

## Scripts

```bash
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to database
npm run db:migrate    # Run migrations
npm run db:seed       # Seed demo data
npm run db:studio     # Open Prisma Studio
```
