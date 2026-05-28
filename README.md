# Stonewall Dodgeball Ratings

Private player-rating platform with passcode auth, role-based backend access, CSV import/export, and autosave every 20 seconds.

## Roles

- `rater`: can rate players only.
- `admin`: read-only backend access (completion view, players/raters tables, CSV downloads) plus rating access.
- `superadmin`: single account with full controls and rating access.

## Local setup with Docker (recommended)

1. Start Postgres:

```bash
docker compose up -d
```

2. Copy `.env.example` to `.env` and set at least:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/player_scores?schema=public"
SESSION_SECRET="paste-output-of-openssl-rand-base64-48"
SUPERADMIN_EMAIL="coltonredwine@gmail.com"
SUPERADMIN_PASSCODE="your-passcode"
```

Generate `SESSION_SECRET`:

```bash
openssl rand -base64 48
```

3. Install dependencies, migrate, seed, and run:

```bash
npm install
npm run prisma:generate
npx prisma migrate dev --name init
npm run setup:init
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login).

Stop the database when done:

```bash
docker compose down
```

## Local Setup (without Docker)

1. Copy `.env.example` to `.env` and fill values.
2. Install dependencies:

```bash
npm install
```

3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Create and run Prisma migrations against your Postgres database:

```bash
npx prisma migrate dev --name init
```

5. Initialize default app data (one-time per environment):

```bash
npm run setup:init
```

6. Start dev server:

```bash
npm run dev
```

## CSV Formats

- Player import: `First Name,Last Name,Link` (`Link` optional). When set, the player name on the rating grid links out in a new tab.
- Rater import: `Name,Email,is_admin,Passcode,Expires At` (`is_admin`, `Passcode`, and `Expires At` optional). Set `Passcode` (and optionally `Expires At`) on import to create or replace login codes. Without `Expires At`, the passcode expires one year from import. Re-importing without a passcode leaves existing passcodes unchanged.
- Rater export: `First Name,Last Name,Power,Accuracy,Intimidation,Catching,Evasion,Nerve,I don't know this player`
- All-raters export adds `Rater Name,Rater Email`

## Render Deployment

Use `render.yaml` to provision:
- Web service (`player-scores`)
- Postgres database (`player-scores-db`)

Required env vars:
- `DATABASE_URL`
- `SESSION_SECRET`
- `SUPERADMIN_EMAIL`
- `SUPERADMIN_PASSCODE`
