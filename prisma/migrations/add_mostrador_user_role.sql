-- Rol de personal de mostrador (permisos limitados en admin)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MOSTRADOR';
