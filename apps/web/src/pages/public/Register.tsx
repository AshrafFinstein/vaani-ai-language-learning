import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { RegisterInput } from '@vaani/types';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/FieldError';
import { useRegister, toFormError } from '@/features/auth/useAuth';

export default function RegisterPage() {
  const register = useRegister();
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFields({});
    setFormError(null);

    const data = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = RegisterInput.safeParse(data);
    if (!parsed.success) {
      setFields(parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    register.mutate(parsed.data, {
      onError: (err) => {
        const { message, fields: f } = toFormError(err);
        if (f) setFields(f);
        else setFormError(message);
      },
    });
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start practicing in under a minute."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {formError && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" autoComplete="name" placeholder="Alex Rivera" />
          <FieldError messages={fields.name} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
          <FieldError messages={fields.email} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="••••••••" />
          <FieldError messages={fields.password} />
          <p className="text-xs text-muted-foreground">
            At least 8 characters, with upper, lower, and a number.
          </p>
        </div>
        <Button type="submit" variant="gradient" className="w-full" disabled={register.isPending}>
          {register.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
