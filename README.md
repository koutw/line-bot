
# Line Proxy Shop

A LINE Bot e-commerce application built with Next.js, Prisma, and PostgreSQL.

## Features
- **LINE Messaging API Integration**: Handles webhooks and replies.
- **Admin Dashboard**: Manage products and orders.
- **PostgreSQL**: Robust database for production.
- **Render.com Ready**: Configured for easy deployment.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL (Prisma ORM)
- **UI**: Tailwind CSS, Shadcn UI
- **Deployment**: Render.com

## Getting Started Locally

### 1. Clone the repository
```bash
git clone https://github.com/koutw/line-bot.git
cd line-bot
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/line_proxy_shop"
CHANNEL_ACCESS_TOKEN="your_channel_access_token"
CHANNEL_SECRET="your_channel_secret"
NEXTAUTH_SECRET="your_nextauth_secret"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Database Setup
Ensure you have a local PostgreSQL running (or use Docker).
```bash
# Push schema to DB
npx prisma db push
```

### 5. Run the server
```bash
npm run dev
```

## Deployment on Render.com

This project is configured for **Render Blueprints**.

1.  Push your code to GitHub.
2.  Log in to [Render.com](https://render.com).
3.  Click **New +** -> **Blueprint**.
4.  Connect this repository.
5.  Render will automatically create the **Web Service** and **PostgreSQL Database**.
6.  **IMPORTANT**: Go to the **Environment** settings of the Web Service and manually add:
    -   `CHANNEL_ACCESS_TOKEN`
    -   `CHANNEL_SECRET`

## Database Management
- **Schema Update**: The deployment command `npx prisma db push` automatically updates the schema on every deploy.
- **Studio**: Run `npx prisma studio` locally to manage data.

## Scripts
- `npm run dev`: Start working dev server
- `npm run build`: Build for production
- `npm start`: Start production server
- `scripts/load-test.ts`: Load testing script (Usage: `npx tsx scripts/load-test.ts`)
