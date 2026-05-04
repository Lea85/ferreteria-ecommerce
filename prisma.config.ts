import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma CLI no carga `.env.local` por defecto; Next sí. Cargamos ambos como en desarrollo.
config({ path: ".env" });
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    // Para migraciones usa DIRECT_URL (conexión directa a Supabase, sin pgbouncer)
    // En runtime, la app usa DATABASE_URL (connection pooler, óptimo para serverless)
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
});
