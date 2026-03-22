import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    // Para migraciones usa DIRECT_URL (conexión directa a Supabase, sin pgbouncer)
    // En runtime, la app usa DATABASE_URL (connection pooler, óptimo para serverless)
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
});
