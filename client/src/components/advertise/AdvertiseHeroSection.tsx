import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import advertiseHero from '@/assets/advertisewithus-hero.png';

type CTA = {
  label: string;
  href: string;
};

type TrustSignal = {
  content: string;
};

function renderHeadlineWithHighlight(headline: string, highlightText?: string) {
  if (!highlightText) return headline;

  const index = headline.toLowerCase().indexOf(highlightText.toLowerCase());
  if (index === -1) return headline;

  const before = headline.slice(0, index);
  const match = headline.slice(index, index + highlightText.length);
  const after = headline.slice(index + highlightText.length);

  return (
    <>
      {before}
      <span className="bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 bg-clip-text text-transparent">
        {match}
      </span>
      {after}
    </>
  );
}

export function AdvertiseHeroSection({
  headline,
  subheadline,
  primaryCTA,
  secondaryCTA,
  trustSignals = [],
  highlightText,
}: {
  headline: string;
  subheadline: string;
  primaryCTA: CTA;
  secondaryCTA?: CTA;
  trustSignals?: TrustSignal[];
  highlightText?: string;
}) {
  return (
    <div className="relative overflow-hidden border-b border-blue-100/80 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_38%),radial-gradient(circle_at_10%_30%,rgba(59,130,246,0.12),transparent_28%),linear-gradient(180deg,#f7fbff_0%,#ffffff_40%,#ffffff_100%)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(#1d4ed8_1px,transparent_1px)] [background-size:22px_22px]"
        aria-hidden="true"
      />

      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-cyan-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full bg-blue-200/35 blur-3xl" />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500" />
            Premium Property Ecosystem
          </p>

          <h1
            id="hero-heading"
            className="mt-5 text-balance text-4xl font-semibold leading-[1.06] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem]"
          >
            {renderHeadlineWithHighlight(headline, highlightText)}
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
            {subheadline}
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-11 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-7 text-white shadow-lg shadow-blue-200/60 hover:from-blue-700 hover:to-cyan-600"
            >
              <a href={primaryCTA.href}>{primaryCTA.label}</a>
            </Button>

            {secondaryCTA ? (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 rounded-full border-blue-200 bg-white/70 px-7 text-slate-900 hover:bg-white"
              >
                <a href={secondaryCTA.href} className="inline-flex items-center gap-2">
                  {secondaryCTA.label} <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-5xl">
          <div className="relative overflow-hidden rounded-3xl border border-blue-100/80 bg-white/70 p-4 shadow-[0_30px_80px_-45px_rgba(37,99,235,0.6)] backdrop-blur sm:p-5">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-200/35 blur-3xl" />
            <div className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-blue-200/35 blur-3xl" />

            <div className="relative overflow-hidden rounded-2xl border border-blue-100/70 bg-white">
              <img
                src={advertiseHero}
                alt="Property Listify dashboard preview"
                className="h-[300px] w-full object-cover sm:h-[380px] lg:h-[440px]"
                loading="eager"
              />

              <div className="pointer-events-none absolute inset-0 bg-white/14" />
              <div className="pointer-events-none absolute inset-0 opacity-[0.09] [background-image:radial-gradient(#2563eb_1px,transparent_1px)] [background-size:22px_22px]" />

              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-0 top-0 h-14 w-full bg-gradient-to-b from-white/95 to-transparent" />
                <div className="absolute bottom-0 left-0 h-16 w-full bg-gradient-to-t from-white/95 to-transparent" />
                <div className="absolute left-0 top-0 h-full w-12 bg-gradient-to-r from-white/95 to-transparent" />
                <div className="absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-white/95 to-transparent" />
              </div>
            </div>
          </div>

          {trustSignals.length ? (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {trustSignals.map((s, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur"
                >
                  {s.content}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
