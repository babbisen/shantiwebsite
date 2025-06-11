# Inventory and Order Management System

This project is a web-based application built with Next.js that tracks inventory items and customer orders. It includes a PostgreSQL database managed through Prisma ORM and provides seed data for testing and development.

## Prerequisites

- Node.js v18 or later
- npm or another compatible package manager
- PostgreSQL database accessible via `DATABASE_URL`

## Environment Variables

Create a `.env` file in the repository root with the following variable:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

## Setup

1. Install dependencies and generate the Prisma client:
   ```bash
   npm install
   ```
2. Apply migrations to create the database schema:
   ```bash
   npx prisma migrate deploy
   ```
3. Seed the database with initial inventory and order data:
   ```bash
   npx prisma db seed
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at [http://localhost:3000](http://localhost:3000).

