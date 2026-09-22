import { Globe, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useLanguages } from '@/features/language/useLanguages';
import { useUpdateProfile } from '@/features/user/useUpdateProfile';
import { useAuthStore } from '@/stores/authStore';

export function LanguageSwitcher() {
  const user = useAuthStore((s) => s.user);
  const { data: languages } = useLanguages();
  const updateProfile = useUpdateProfile();

  const current = languages?.find((l) => l.code === user?.learningLanguageCode);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          {current ? (
            <span className="text-base leading-none">{current.flagEmoji}</span>
          ) : (
            <Globe className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{current?.name ?? 'Choose language'}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
        <DropdownMenuLabel>Learning language</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {languages?.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            disabled={updateProfile.isPending}
            onClick={() => updateProfile.mutate({ learningLanguageCode: lang.code })}
          >
            <span className="text-base leading-none">{lang.flagEmoji}</span>
            <span>{lang.name}</span>
            <span className="ml-auto text-xs text-muted-foreground">{lang.nativeName}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
