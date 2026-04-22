import React from 'react';
import { motion } from 'framer-motion';
import { softUITokens } from './design-tokens';
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations/advertiseAnimations';
import { CTAButtonGroup } from './CTAButton';

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
      className="hero-section relative overflow-hidden"
      aria-labelledby="hero-headline"
      aria-describedby="hero-subheadline"
      role="banner"
    >
      {/* Dark background matching new "dark hero" intent */}
      <div className="absolute inset-0 bg-slate-900 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 -z-20"></div>
      
      {/* Glow / Pulse active demand background effects */}
      <motion.div 
        className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full blur-[100px] opacity-30 pointer-events-none -z-10"
        style={{ background: `radial-gradient(circle, ${softUITokens.colors.primary.main} 0%, transparent 70%)` }}
        animate={{ opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div 
        className="absolute -bottom-20 left-[20%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-20 pointer-events-none -z-10"
        style={{ background: `radial-gradient(circle, ${softUITokens.colors.secondary.main} 0%, transparent 70%)` }}
        animate={{ opacity: [0.15, 0.3, 0.15], scale: [1, 1.05, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 lg:py-32 relative z-10 text-center">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-100px' }}
          className="flex flex-col items-center"
        >
          {/* Eyebrow */}
          {eyebrow && (
            <motion.div variants={staggerItem} className="mb-6">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-secondary/10 border border-secondary/20 text-secondary-light">
                {eyebrow}
              </span>
            </motion.div>
          )}

          {/* Headline */}
          <motion.h1
            id="hero-headline"
            className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-white"
            variants={fadeUp}
          >
            {headline}
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            id="hero-subheadline"
            className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto mb-10 font-light"
            variants={fadeUp}
          >
            {subheadline}
          </motion.p>

          {/* CTA Group */}
          <motion.div variants={fadeUp} className="flex flex-wrap gap-4 justify-center mb-16">
             <button 
                onClick={primaryCTA.onClick}
                className="px-8 py-3.5 rounded-lg font-bold text-sm md:text-base transition-all duration-200 bg-secondary text-white hover:bg-secondary-dark hover:-translate-y-0.5 shadow-lg shadow-secondary/25"
             >
               {primaryCTA.label}
             </button>
             <button 
                onClick={secondaryCTA.onClick}
                className="px-8 py-3.5 rounded-lg font-bold text-sm md:text-base transition-all duration-200 bg-white/5 border border-white/20 text-white hover:bg-white/10 relative group overflow-hidden"
             >
                {/* Subtle sweeping highlight on secondary button for "active demand" feel */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
               {secondaryCTA.label}
             </button>
          </motion.div>

          {/* Stats Row */}
          {stats && stats.length > 0 && (
            <motion.div 
              variants={staggerItem}
              className="flex flex-wrap justify-center gap-8 md:gap-12 lg:gap-16 pt-10 border-t border-white/10 w-full"
            >
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl md:text-4xl font-extrabold text-white mb-2 leading-none flex items-baseline justify-center">
                    {stat.value}
                    {stat.suffix && <span className="text-secondary ml-0.5">{stat.suffix}</span>}
                  </div>
                  <div className="text-xs md:text-sm text-slate-400 tracking-wide">
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

        </motion.div>
      </div>
    </section>
  );
};
