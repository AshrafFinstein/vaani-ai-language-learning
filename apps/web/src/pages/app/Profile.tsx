import { useState, type FormEvent } from 'react';
import { UpdateProfileInput, LearningLevel, ThemePreference } from '@vaani/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { FieldError } from '@/components/FieldError';
import { useLanguages } from '@/features/language/useLanguages';
import { useUpdateProfile } from '@/features/user/useUpdateProfile';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/components/theme/theme-provider';
import { ApiClientError } from '@/lib/api';

/** Human-friendly labels for the CEFR-aligned learning levels. */
const LEVEL_LABELS: Record<LearningLevel, string> = {
  BEGINNER: 'Beginner (A1)',
  ELEMENTARY: 'Elementary (A2)',
  INTERMEDIATE: 'Intermediate (B1)',
  UPPER_INTERMEDIATE: 'Upper intermediate (B2)',
  ADVANCED: 'Advanced (C1+)',
};

const THEME_LABELS: Record<ThemePreference, string> = {
  LIGHT: 'Light',
  DARK: 'Dark',
  SYSTEM: 'System',
};

/** Maps the persisted theme preference to the theme-provider's local mode. */
const THEME_TO_MODE = { LIGHT: 'light', DARK: 'dark', SYSTEM: 'system' } as const;

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const { data: languages } = useLanguages();
  const updateProfile = useUpdateProfile();
  const { setTheme } = useTheme();

  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFields({});
    setFormError(null);
    setSuccess(false);

    const raw = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = UpdateProfileInput.safeParse({
      name: raw.name,
      learningLanguageCode: raw.learningLanguageCode,
      level: raw.level,
      dailyGoalMinutes: Number(raw.dailyGoalMinutes),
      theme: raw.theme,
    });
    if (!parsed.success) {
      setFields(parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    updateProfile.mutate(parsed.data, {
      onSuccess: (data) => {
        // Keep the live theme in sync with the saved preference.
        setTheme(THEME_TO_MODE[data.user.theme]);
        setSuccess(true);
      },
      onError: (err) => {
        if (err instanceof ApiClientError && err.fields) setFields(err.fields);
        else setFormError(err instanceof Error ? err.message : 'Something went wrong.');
      },
    });
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Profile &amp; settings</h1>
        <p className="text-muted-foreground">
          Manage your account, learning language, and daily goal.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            {formError && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </div>
            )}
            {success && (
              <div className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
                Profile updated.
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={user.name}
                autoComplete="name"
                placeholder="Your name"
              />
              <FieldError messages={fields.name} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="learningLanguageCode">Learning language</Label>
              <Select
                id="learningLanguageCode"
                name="learningLanguageCode"
                defaultValue={user.learningLanguageCode ?? ''}
              >
                <option value="" disabled>
                  Choose a language
                </option>
                {languages?.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flagEmoji} {lang.name}
                  </option>
                ))}
              </Select>
              <FieldError messages={fields.learningLanguageCode} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="level">Level</Label>
              <Select id="level" name="level" defaultValue={user.level ?? 'BEGINNER'}>
                {LearningLevel.options.map((value) => (
                  <option key={value} value={value}>
                    {LEVEL_LABELS[value]}
                  </option>
                ))}
              </Select>
              <FieldError messages={fields.level} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dailyGoalMinutes">Daily goal (minutes)</Label>
              <Input
                id="dailyGoalMinutes"
                name="dailyGoalMinutes"
                type="number"
                min={5}
                max={600}
                step={5}
                defaultValue={user.dailyGoalMinutes}
              />
              <FieldError messages={fields.dailyGoalMinutes} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="theme">Theme</Label>
              <Select id="theme" name="theme" defaultValue={user.theme}>
                {ThemePreference.options.map((value) => (
                  <option key={value} value={value}>
                    {THEME_LABELS[value]}
                  </option>
                ))}
              </Select>
              <FieldError messages={fields.theme} />
            </div>

            <Button type="submit" variant="gradient" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
