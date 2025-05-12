import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MapIcon, Stethoscope } from 'lucide-react'; // Using Stethoscope as a logo icon

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/hospitals" passHref>
            <Button variant="outline" className="flex items-center gap-2">
              <MapIcon className="h-5 w-5" />
              <span>Nearby Hospitals</span>
            </Button>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <Stethoscope className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              HealthAssist AI
            </h1>
          </Link>
        </div>
        {/* Add any other header items here, like user profile, settings, etc. */}
      </div>
    </header>
  );
}
