import { SlidersHorizontal } from 'lucide-react';
import { MeetingSettingsPanel } from '@/features/meeting/components/MeetingSettingsPanel';

export default function MeetingSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="vaani-gradient flex h-11 w-11 items-center justify-center rounded-xl text-white">
          <SlidersHorizontal className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meeting Intelligence Settings</h1>
          <p className="text-sm text-muted-foreground">
            Automation, capture, and AI extraction preferences for your meetings.
          </p>
        </div>
      </div>
      <MeetingSettingsPanel />
    </div>
  );
}
