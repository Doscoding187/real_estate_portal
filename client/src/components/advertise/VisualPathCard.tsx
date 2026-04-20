import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { ArrowRight, type LucideIcon } from 'lucide-react';

interface VisualPathCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  ctaText: string;
  benefits: string[];
}

export function VisualPathCard({
  title,
  description,
  icon: Icon,
  href,
  ctaText,
  benefits,
}: VisualPathCardProps) {
  return (
    <Card className="h-full flex flex-col hover:border-primary/50 transition-colors duration-300">
      <CardContent className="p-6 flex-1 flex flex-col items-start text-left">
        <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-6">
          <Icon size={24} />
        </div>
        <h3 className="text-2xl font-semibold mb-3">{title}</h3>
        <p className="text-muted-foreground mb-6 flex-1">{description}</p>

        <ul className="mb-8 space-y-3 w-full">
          {benefits.map((benefit, i) => (
            <li key={i} className="flex items-start text-sm text-slate-700">
              <span className="text-primary mr-3 text-lg leading-none">•</span>
              {benefit}
            </li>
          ))}
        </ul>

        <Link href={href} className="w-full">
          <Button className="w-full group" size="lg">
            {ctaText}
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
