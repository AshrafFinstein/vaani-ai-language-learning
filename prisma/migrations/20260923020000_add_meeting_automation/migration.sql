-- Meeting AI automation (calendar-driven auto-capture): lifecycle state machine,
-- notifications, extracted questions, important topics, and expanded settings.

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'NOTIFIED', 'STARTED', 'CAPTURING', 'PROCESSING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MEETING_REMINDER', 'MEETING_STARTED', 'ANALYSIS_READY');

-- AlterTable: Meeting — lifecycle state + calendar linkage
ALTER TABLE "Meeting" ADD COLUMN "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED';
ALTER TABLE "Meeting" ADD COLUMN "teamsMeetingId" TEXT;
ALTER TABLE "Meeting" ADD COLUMN "joinUrl" TEXT;
ALTER TABLE "Meeting" ADD COLUMN "externalCalendarId" TEXT;
ALTER TABLE "Meeting" ADD COLUMN "notifiedAt" TIMESTAMP(3);
ALTER TABLE "Meeting" ADD COLUMN "startedAt" TIMESTAMP(3);
ALTER TABLE "Meeting" ADD COLUMN "endedAt" TIMESTAMP(3);

-- AlterTable: MeetingSummary — important topics
ALTER TABLE "MeetingSummary" ADD COLUMN "importantTopics" TEXT[];

-- AlterTable: MeetingSettings — automation + capture + extraction toggles
ALTER TABLE "MeetingSettings" ADD COLUMN "autoCapture" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MeetingSettings" ADD COLUMN "reminderMinutes" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "MeetingSettings" ADD COLUMN "captureAudio" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MeetingSettings" ADD COLUMN "captureTranscript" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MeetingSettings" ADD COLUMN "captureSpeaker" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MeetingSettings" ADD COLUMN "askBeforeCapture" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "MeetingSettings" ADD COLUMN "extractSummary" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "MeetingSettings" ADD COLUMN "extractDecisions" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "MeetingSettings" ADD COLUMN "extractActionItems" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "MeetingSettings" ADD COLUMN "extractQuestions" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "MeetingSettings" ADD COLUMN "extractTopics" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable: MeetingQuestion
CREATE TABLE "MeetingQuestion" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "askedBy" TEXT NOT NULL DEFAULT 'Unassigned',
    "answered" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MeetingQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Notification
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "meetingId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeetingQuestion_meetingId_ordinal_idx" ON "MeetingQuestion"("meetingId", "ordinal");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Meeting_userId_status_idx" ON "Meeting"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_userId_externalCalendarId_key" ON "Meeting"("userId", "externalCalendarId");

-- AddForeignKey
ALTER TABLE "MeetingQuestion" ADD CONSTRAINT "MeetingQuestion_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
