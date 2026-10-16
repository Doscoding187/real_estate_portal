import { Bell, Heart, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getAccountAuthHref } from '@/lib/publicNavigation';

const ACCOUNT_BENEFITS = [
  {
    icon: Heart,
    title: 'Build your property shortlist',
    description: 'Keep the properties you love together, ready to revisit.',
  },
  {
    icon: Bell,
    title: 'Find new matches',
    description: 'Save searches and choose email alerts for new listings.',
  },
  {
    icon: Smartphone,
    title: 'Pick up on any device',
    description: 'Your saved properties stay with your account.',
  },
];

export function SavePropertyPrompt({
  open,
  onOpenChange,
  returnPath,
  returnFocusTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnPath: string;
  returnFocusTo: HTMLElement | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto rounded-2xl p-5 sm:max-w-md sm:p-6"
        onCloseAutoFocus={event => {
          if (returnFocusTo?.isConnected) {
            event.preventDefault();
            returnFocusTo.focus();
          }
        }}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Heart className="h-5 w-5" aria-hidden="true" />
        </span>
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl leading-tight">Keep the properties you love</DialogTitle>
          <DialogDescription className="leading-6">
            Create an account to save your favourites and make your next visit easier.
          </DialogDescription>
        </DialogHeader>
        <ul aria-label="Benefits of creating an account" className="space-y-4">
          {ACCOUNT_BENEFITS.map(benefit => (
            <li key={benefit.title} className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <benefit.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{benefit.title}</p>
                <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="rounded-lg bg-muted/50 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
          This property isn’t saved yet. After signing in, you’ll return here. Tap the heart again
          to save it.
        </p>
        <div className="space-y-3">
          <Button asChild className="h-11 w-full bg-[#2774AE] hover:bg-[#1d5c8a]">
            <a href={getAccountAuthHref('register', returnPath)}>Create an account</a>
          </Button>
          <p className="flex flex-wrap items-center justify-center gap-x-1 text-sm text-muted-foreground">
            Already have an account?
            <a
              href={getAccountAuthHref('signin', returnPath)}
              className="inline-flex min-h-11 items-center rounded-md px-1 font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              Sign in
            </a>
          </p>
        </div>
        <Button variant="ghost" className="h-11" onClick={() => onOpenChange(false)}>
          Keep browsing
        </Button>
      </DialogContent>
    </Dialog>
  );
}
