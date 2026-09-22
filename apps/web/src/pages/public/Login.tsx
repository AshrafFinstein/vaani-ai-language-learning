import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { LoginInput } from '@vaani/types';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/FieldError';
import { useLogin, toFormError } from '@/features/auth/useAuth';

export default function LoginPage() {
  const login = useLogin();
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFields({});
    setFormError(null);

    const data = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = LoginInput.safeParse(data);
    if (!parsed.success) {
      setFields(parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    login.mutate(parsed.data, {
      onError: (err) => {
        const { message, fields: f } = toFormError(err);
        if (f) setFields(f);
        else setFormError(message);
      },
    });
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue your learning streak."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Sign up
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
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
          <FieldError messages={fields.email} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary">
              Forgot password?
            </Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" />
          <FieldError messages={fields.password} />
        </div>
        <Button type="submit" variant="gradient" className="w-full" disabled={login.isPending}>
          {login.isPending ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
