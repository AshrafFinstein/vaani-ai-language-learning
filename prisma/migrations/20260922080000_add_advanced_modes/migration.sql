-- Advanced AI Modes (Phase 8): character conversations, debate, and photo conversation.

-- AlterEnum: extend ConversationMode with CHARACTER and SCENARIO.
ALTER TYPE "ConversationMode" ADD VALUE 'CHARACTER';
ALTER TYPE "ConversationMode" ADD VALUE 'SCENARIO';

-- AlterEnum: extend PracticeKind with CHARACTER and SCENARIO for progress analytics.
ALTER TYPE "PracticeKind" ADD VALUE 'CHARACTER';
ALTER TYPE "PracticeKind" ADD VALUE 'SCENARIO';

-- CreateEnum
CREATE TYPE "DebateSide" AS ENUM ('FOR', 'AGAINST');

-- CreateEnum
CREATE TYPE "DebateStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- AlterTable: link a Conversation to an AICharacter (CHARACTER mode).
ALTER TABLE "Conversation" ADD COLUMN "characterId" TEXT;

-- CreateTable
CREATE TABLE "AICharacter" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "setting" TEXT NOT NULL,
    "avatarEmoji" TEXT NOT NULL,
    "greeting" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AICharacter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Debate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "topicKey" TEXT NOT NULL,
    "motion" TEXT NOT NULL,
    "userSide" "DebateSide" NOT NULL,
    "level" "LearningLevel" NOT NULL DEFAULT 'BEGINNER',
    "status" "DebateStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Debate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebateMessage" (
    "id" TEXT NOT NULL,
    "debateId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebateMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" "LearningLevel" NOT NULL DEFAULT 'BEGINNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhotoSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoMessage" (
    "id" TEXT NOT NULL,
    "photoSessionId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AICharacter_key_key" ON "AICharacter"("key");

-- CreateIndex
CREATE INDEX "Conversation_characterId_idx" ON "Conversation"("characterId");

-- CreateIndex
CREATE INDEX "Debate_userId_idx" ON "Debate"("userId");

-- CreateIndex
CREATE INDEX "Debate_userId_updatedAt_idx" ON "Debate"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "DebateMessage_debateId_createdAt_idx" ON "DebateMessage"("debateId", "createdAt");

-- CreateIndex
CREATE INDEX "PhotoSession_userId_idx" ON "PhotoSession"("userId");

-- CreateIndex
CREATE INDEX "PhotoSession_userId_updatedAt_idx" ON "PhotoSession"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "PhotoMessage_photoSessionId_createdAt_idx" ON "PhotoMessage"("photoSessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "AICharacter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debate" ADD CONSTRAINT "Debate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateMessage" ADD CONSTRAINT "DebateMessage_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "Debate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoSession" ADD CONSTRAINT "PhotoSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoMessage" ADD CONSTRAINT "PhotoMessage_photoSessionId_fkey" FOREIGN KEY ("photoSessionId") REFERENCES "PhotoSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
