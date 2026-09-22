import { PrismaClient } from '@prisma/client';

// Single PrismaClient instance for the process (avoids exhausting DB connections).
export const prisma = new PrismaClient();
