import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ForgotPasswordInput } from '@vaani/types';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/FieldError';
import { authApi } from '@/features/auth/auth.api';

export default function ForgotPasswordPage() {
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const mutation = useMutation({ mutationFn: authApi.forgotPassword });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFields({});
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = ForgotPasswordInput.safeParse(data);
    if (!parsed.success) {
      setFields(parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }
    mutation.mutate(parsed.data);
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll email you a link to reset it."
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to login
        </Link>
      }
    >
      {mutation.isSuccess ? (
        <div className="rounded-md bg-success/10 px-4 py-3 text-sm text-foreground">
          If an account exists for that email, a reset link is on its way.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
            <FieldError messages={fields.email} />
          </div>
          <Button type="submit" variant="gradient" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
