import { Button } from '@/components/ui/button';
import { NotFoundState } from '@/components/ui/feedback-state';
import { PageFrame } from '@/components/ui/page-frame';
import { Home } from 'lucide-react';
import { useLocation } from 'wouter';

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation('/');
  };

  return (
    <PageFrame
      contained={false}
      className="flex min-h-screen w-full items-center justify-center bg-muted/30 px-[var(--content-padding-mobile)]"
    >
      <NotFoundState
        title="Page not found"
        description="Sorry, the page you are looking for does not exist. It may have been moved or deleted."
        action={
          <Button onClick={handleGoHome}>
            <Home className="size-4" aria-hidden="true" />
            Go home
          </Button>
        }
      />
    </PageFrame>
  );
}
