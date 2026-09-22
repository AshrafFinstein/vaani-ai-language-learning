import { useRef, useState } from 'react';
import { Image as ImageIcon, Upload } from 'lucide-react';
import { LearningLevel } from '@vaani/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/authStore';

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  ELEMENTARY: 'Elementary',
  INTERMEDIATE: 'Intermediate',
  UPPER_INTERMEDIATE: 'Upper int.',
  ADVANCED: 'Advanced',
};

interface PhotoPickerProps {
  isPending?: boolean;
  onStart: (image: string, level: (typeof LearningLevel.options)[number]) => void;
}

/**
 * Lets the learner pick an image by uploading a file (read as a base64 data-URL) or by
 * pasting an image URL. Storage is intentionally simple — the string is sent as-is.
 */
export function PhotoPicker({ isPending, onStart }: PhotoPickerProps) {
  const user = useAuthStore((s) => s.user);
  const [level, setLevel] = useState<(typeof LearningLevel.options)[number]>(
    user?.level ?? 'BEGINNER',
  );
  const [image, setImage] = useState<string>('');
  const [urlValue, setUrlValue] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function onFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setImage(result);
      setUrlValue('');
    };
    reader.readAsDataURL(file);
  }

  function useUrl() {
    const trimmed = urlValue.trim();
    if (trimmed) setImage(trimmed);
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 px-4 py-10 text-center animate-fade-in">
      <span className="vaani-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-white">
        <ImageIcon className="h-7 w-7" />
      </span>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Photo conversation</h1>
        <p className="text-muted-foreground">
          Share a photo and practice describing and discussing it with Vaani.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-1.5">
        {LearningLevel.options.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setLevel(value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              level === value
                ? 'border-transparent bg-primary text-primary-foreground'
                : 'hover:bg-accent',
            )}
          >
            {LEVEL_LABELS[value]}
          </button>
        ))}
      </div>

      <div className="w-full space-y-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-muted-foreground transition-colors hover:bg-accent"
        >
          <Upload className="h-6 w-6" />
          <span className="text-sm">Upload an image</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label="Upload an image"
          onChange={(e) => onFile(e.target.files?.[0])}
        />

        <div className="flex items-center gap-2">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or paste an image URL</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-2 text-left">
          <Label htmlFor="photo-url">Image URL</Label>
          <div className="flex gap-2">
            <Input
              id="photo-url"
              placeholder="https://example.com/photo.jpg"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
            />
            <Button type="button" variant="outline" onClick={useUrl} disabled={!urlValue.trim()}>
              Use
            </Button>
          </div>
        </div>

        {image && (
          <div className="overflow-hidden rounded-xl border">
            <img src={image} alt="Selected for discussion" className="max-h-64 w-full object-contain" />
          </div>
        )}
      </div>

      <Button
        variant="gradient"
        size="lg"
        disabled={!image || isPending}
        onClick={() => image && onStart(image, level)}
      >
        Start talking about it
      </Button>
    </div>
  );
}
