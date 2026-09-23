-- Admin-free AVD calendar path: per-user published (read-only) Outlook/Teams ICS feed
-- URL. When set, calendar sync prefers this over the env-level ICS_CALENDAR_URL / Graph.

-- AlterTable: MeetingSettings — per-user ICS feed URL
ALTER TABLE "MeetingSettings" ADD COLUMN "icsCalendarUrl" TEXT;
