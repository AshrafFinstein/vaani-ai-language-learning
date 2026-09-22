import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';

/** Lightweight placeholder for secondary public pages (Features, Pricing, About, Terms, Privacy). */
export default function MarketingPlaceholder({ title }: { title: string }) {
  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 py-8">
      <Link to="/">
        <Logo />
      </Link>
      <div className="flex flex-1 flex-col items-start justify-center gap-4 py-16">
        <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">
          This page is part of Vaani AI&apos;s public site and will be filled in as the product
          grows. For now, jump straight into learning.
        </p>
        <div className="flex gap-3">
          <Button asChild variant="gradient">
            <Link to="/register">Get started</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" /> Back home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
