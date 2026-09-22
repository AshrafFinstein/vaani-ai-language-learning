-- CreateEnum
CREATE TYPE "ConversationMode" AS ENUM ('CHAT', 'ROLEPLAY', 'DIALOGUE');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "mode" "ConversationMode" NOT NULL DEFAULT 'CHAT',
ADD COLUMN     "scenarioKey" TEXT;

