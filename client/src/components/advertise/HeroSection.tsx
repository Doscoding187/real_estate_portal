import React from 'react';
import { motion } from 'framer-motion';
import { softUITokens } from './design-tokens';
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations/advertiseAnimations';
import { WorkspaceProductPreview } from './DashboardShowcaseSection';

export interface CTAConfig {
  label: string;
  href?: string;
  variant: 'primary' | 'secondary' | 'outline' | 'white';
  onClick?: () => void;
  icon?: React.ReactNode;
}

export interface HeroStat {
  value: string;
  suffix?: string;
  label: string;
}

export interface HeroSectionProps {
  eyebrow?: string;
  headline: React.ReactNode;
  subheadline: string;
  primaryCTA: CTAConfig;
  secondaryCTA: CTAConfig;
  stats: HeroStat[];
}

interface HeroCTAProps {
  cta: CTAConfig;
  secondary?: boolean;
}

function HeroCTA({ cta, secondary = false }: HeroCTAProps) {
  const className = secondary
    ? 'relative group inline-flex items-center justify-center overflow-hidden rounded-lg border border-white/25 bg-white/5 px-7 py-3.5 text-sm font-bold text-white transition-all duration-200 hover:border-white/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 md:text-base'
    : 'inline-flex items-center justify-center rounded-lg bg-orange-500 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-950/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 md:text-base';

  const content = (
    <>
      {secondary && (
        <span
          className="absolute inset-0 h-full w-full -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"
          aria-hidden="true"
        />
      )}
      <span className={secondary ? 'relative z-10' : undefined}>
        {cta.icon}
        {cta.label}
      </span>
    </>
  );

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    cta.onClick?.();

    // A CTA without a destination is an intentional action button. A CTA
    // with a destination keeps the browser's native navigation behaviour.
    if (!cta.href) event.preventDefault();
  };

  if (cta.href) {
    return (
      <a href={cta.href} onClick={handleClick} className={className} aria-label={cta.label}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={handleClick} className={className} aria-label={cta.label}>
      {content}
    </button>
  );
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  eyebrow,
  headline,
  subheadline,
  primaryCTA,
  secondaryCTA,
  stats,
}) => {
  return (
    <section
      data-testid="hero-section"
      className="hero-section relative isolate overflow-hidden bg-slate-900"
      aria-labelledby="hero-headline"
      aria-describedby="hero-subheadline"
      role="banner"
    >
      {/* Keep decorative layers inside an isolated stacking context. */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950" />

      {/* Glow / Pulse active demand background effects */}
      <motion.div
        className="pointer-events-none absolute -right-32 -top-32 z-0 h-[500px] w-[500px] rounded-full blur-[100px] opacity-30"
        style={{
          background: `radial-gradient(circle, ${softUITokens.colors.primary.main} 0%, transparent 70%)`,
        }}
        animate={{ opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-20 left-[20%] z-0 h-[400px] w-[400px] rounded-full blur-[100px] opacity-20"
        style={{
          background: `radial-gradient(circle, ${softUITokens.colors.secondary.main} 0%, transparent 70%)`,
        }}
        animate={{ opacity: [0.15, 0.3, 0.15], scale: [1, 1.05, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8 lg:py-28">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-100px' }}
          className="grid items-center gap-12 lg:grid-cols-[1.14fr_.86fr] lg:gap-14"
        >
          <div className="max-w-3xl text-left">
            {/* Eyebrow */}
            {eyebrow && (
              <motion.div variants={staggerItem} className="mb-6">
                <span className="inline-block rounded-full border border-blue-300/20 bg-blue-300/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-blue-100">
                  {eyebrow}
                </span>
              </motion.div>
            )}

            {/* Headline */}
            <motion.h1
              id="hero-headline"
              className="mb-6 text-4xl font-bold leading-[1.05] tracking-tight text-white md:text-5xl lg:text-[3.25rem]"
              variants={fadeUp}
            >
              {headline}
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              id="hero-subheadline"
              className="mb-9 max-w-2xl text-lg font-light leading-8 text-slate-300 md:text-xl md:leading-9"
              variants={fadeUp}
            >
              {subheadline}
            </motion.p>

            {/* CTA Group */}
            <motion.div variants={fadeUp} className="mb-10 flex flex-wrap justify-start gap-4">
              <HeroCTA cta={primaryCTA} />
              <HeroCTA cta={secondaryCTA} secondary />
            </motion.div>

            {/* Factual reassurance row */}
            {stats && stats.length > 0 && (
              <motion.div
                variants={staggerItem}
                className="flex flex-wrap gap-x-7 gap-y-4 border-t border-white/10 pt-6"
              >
                {stats.map((stat, i) => (
                  <div key={i} className="flex items-baseline gap-1.5">
                    <div className="text-lg font-extrabold leading-none text-white md:text-xl">
                      {stat.value}
                      {stat.suffix && <span className="text-blue-300">{stat.suffix}</span>}
                    </div>
                    <div className="text-xs tracking-wide text-slate-400">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>

          <motion.div variants={fadeUp} className="relative mx-auto w-full max-w-2xl lg:mx-0">
            <div
              className="pointer-events-none absolute -inset-8 rounded-full bg-blue-500/15 blur-3xl"
              aria-hidden="true"
            />
            <div className="relative">
              <WorkspaceProductPreview />
              <p className="mt-3 text-center text-xs text-slate-400">
                Illustrative workspace view — not live market activity.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
