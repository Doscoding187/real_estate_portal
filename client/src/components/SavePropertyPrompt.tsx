import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getAccountAuthHref } from '@/lib/publicNavigation';

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
        className="rounded-2xl"
        onCloseAutoFocus={event => {
          if (returnFocusTo?.isConnected) {
            event.preventDefault();
            returnFocusTo.focus();
          }
        }}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#2774AE]">
          <Heart className="h-5 w-5" aria-hidden="true" />
        </span>
        <DialogHeader>
          <DialogTitle>Save this property</DialogTitle>
          <DialogDescription className="leading-6">
            This property hasn’t been saved. Sign in or create an account to keep your favourite
            homes together and access your shortlist on any device.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm leading-6 text-slate-600">
          We’ll bring you back here after signing in, so you can save it and continue your search.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="h-11 flex-1 bg-[#2774AE] hover:bg-[#1d5c8a]">
            <a href={getAccountAuthHref('signin', returnPath)}>Sign in</a>
          </Button>
          <Button asChild variant="outline" className="h-11 flex-1">
            <a href={getAccountAuthHref('register', returnPath)}>Create an account</a>
          </Button>
        </div>
        <Button variant="ghost" className="h-11" onClick={() => onOpenChange(false)}>
          Keep browsing
        </Button>
      </DialogContent>
    </Dialog>
  );
}
