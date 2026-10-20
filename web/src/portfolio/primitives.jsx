import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const SECTION_EASE = [0.25, 0.1, 0.25, 1];

export const onAnchorClick = (event, href) => {
  if (!href || !href.startsWith('#') || href.length < 2) return;
  const target = document.getElementById(href.slice(1));
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
};

export const ArrowUpRight = ({ className }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('size-3.5', className)}
    >
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
};

export const ArrowRight = ({ className }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('size-3.5', className)}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
};

export const RingLink = ({
  href,
  children,
  ariaLabel,
  target,
  rel,
  outerClassName,
  innerClassName,
  onClick,
}) => {
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      target={target}
      rel={rel ?? (target === '_blank' ? 'noreferrer' : undefined)}
      onClick={(e) => {
        if (onClick) onClick(e);
        if (href?.startsWith('#')) onAnchorClick(e, href);
      }}
      className={cn('group relative inline-flex shrink-0 cursor-pointer', outerClassName)}
    >
      <span
        aria-hidden="true"
        className="pf-gradient pointer-events-none absolute -inset-[2px] rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <span
        className={cn(
          'relative inline-flex items-center justify-center gap-1.5 rounded-full transition-all duration-300',
          innerClassName,
        )}
      >
        {children}
      </span>
    </a>
  );
};

export const SectionHeader = ({
  eyebrow,
  lead,
  accent,
  trailing = '',
  subtext,
  viewAll,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: SECTION_EASE }}
      viewport={{ once: true, margin: '0px' }}
      className={cn('w-full', className)}
    >
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-[hsl(var(--stroke))]" />
        <span className="text-[11px] sm:text-xs tracking-[0.25em] text-[hsl(var(--muted))] uppercase font-mono">{eyebrow}</span>
      </div>
      <div className="mt-3.5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[42px] leading-tight font-normal tracking-tight text-white">
            {lead} <span className="font-display italic font-normal text-white">{accent}</span>
            {trailing}
          </h2>
          {subtext && (
            <p className="mt-2.5 max-w-lg text-xs sm:text-sm text-[hsl(var(--muted))] leading-relaxed font-sans">{subtext}</p>
          )}
        </div>
        {viewAll ? (
          <RingLink
            href={viewAll.href}
            outerClassName="hidden sm:inline-flex shrink-0"
            innerClassName="bg-[hsl(var(--surface))] px-4 py-2 text-xs text-white backdrop-blur-md border border-[hsl(var(--stroke))] hover:border-white/30"
          >
            {viewAll.label}
            <ArrowRight className="size-3" />
          </RingLink>
        ) : null}
      </div>
    </motion.div>
  );
};

