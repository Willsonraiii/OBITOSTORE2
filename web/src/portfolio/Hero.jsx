import React, { useState, useEffect } from 'react';
import { ArrowUpRight, RingLink } from './primitives';
import { cn } from '@/lib/utils';
import Logo from '../Logo.jsx';
import {
  UserIcon, ChevronDownIcon, PremiumKeyIcon, LogoutIcon
} from '../icons.jsx';

const ROLES = [
  'Lossless 60fps Fluidity',
  'Native 120fps Motion',
  '10-bit HLG Rec.2020',
  'Bit-for-Bit Stream Copy',
  '19200 Base Clock',
];
const ROLE_INTERVAL = 2200;

export const Navbar = ({
  activeTab,
  onSwitchTab,
  busy,
  memberPreview,
  ownerAuthenticated,
  currentUserName,
  isMasterOwner,
  onOpenSignIn,
  onOpenAdmin,
  onSignOut,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const [showMoreMenu, setShowMoreMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const primaryNavItems = [
    { id: 'home', label: 'Home' },
    { id: 'optimizer', label: 'Optimizer' },
    { id: 'compare', label: 'Compare' },
  ];

  const secondaryNavItems = [
    { id: 'inspect', label: 'Inspector' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'guide', label: 'Guide' },
    { id: 'specs', label: 'Specs' },
  ];

  const handleNavClick = (id) => {
    setShowMoreMenu(false);
    if (id === 'compare') {
      if (activeTab === 'home') {
        const el = document.getElementById('compare');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else {
        onSwitchTab('home');
        setTimeout(() => {
          const el = document.getElementById('compare');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 120);
      }
      return;
    }
    if (id === 'home' && activeTab === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    onSwitchTab(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="fixed inset-x-0 top-0 z-50 flex justify-center px-2.5 pt-3 sm:px-4 sm:pt-4 md:pt-5 pointer-events-none">
      <div
        className={cn(
          'inline-flex items-center rounded-full border border-white/10 bg-neutral-950/90 px-2 sm:px-3 py-1.5 backdrop-blur-2xl shadow-2xl transition-all duration-300 pointer-events-auto max-w-[98vw]',
          scrolled && 'border-white/20 bg-neutral-950/95 shadow-black/80',
        )}
      >
        {/* Original Living Monogram Logo */}
        <button
          type="button"
          onClick={() => {
            onSwitchTab('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          aria-label="Obito Studio Home"
          className="group relative flex size-8 shrink-0 items-center justify-center transition-transform duration-300 hover:scale-110 mr-1"
        >
          <Logo size={28} />
        </button>

        <span className="mx-1 h-3.5 w-px bg-white/10 block shrink-0" />

        {/* Tab Links - Mobile (Compact) */}
        <div className="flex sm:hidden items-center gap-0.5">
          {primaryNavItems.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => handleNavClick(link.id)}
                className={cn(
                  'flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-colors duration-200 font-medium whitespace-nowrap shrink-0',
                  isActive
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-neutral-400 hover:bg-white/10 hover:text-white',
                )}
              >
                <span>{link.label}</span>
                {link.id === 'optimizer' && busy && (
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                )}
              </button>
            );
          })}

          {/* Mobile "More" dropdown trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu((v) => !v)}
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-colors duration-200 font-medium shrink-0',
                ['inspect', 'dashboard', 'guide', 'specs'].includes(activeTab)
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-neutral-400 hover:bg-white/10 hover:text-white',
              )}
            >
              <span>{['inspect', 'dashboard', 'guide', 'specs'].includes(activeTab) ? activeTab.slice(0, 1).toUpperCase() + activeTab.slice(1) : 'More'}</span>
              <ChevronDownIcon width={10} height={10} />
            </button>

            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-36 rounded-2xl border border-white/15 bg-neutral-900/95 backdrop-blur-xl p-1.5 shadow-2xl z-50 text-xs">
                  {secondaryNavItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors',
                        activeTab === item.id ? 'bg-white/15 text-white font-medium' : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <span>{item.label}</span>
                      {activeTab === item.id && <span className="size-1.5 rounded-full bg-white" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tab Links - Desktop (Full 6 items) */}
        <div className="hidden sm:flex items-center gap-1">
          {[...primaryNavItems, ...secondaryNavItems].map((link) => {
            const isActive = activeTab === link.id || (link.id === 'inspect' && activeTab === 'inspect');
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => handleNavClick(link.id)}
                className={cn(
                  'flex items-center gap-1 rounded-full px-3 py-1.5 text-xs md:text-[13px] transition-colors duration-200 font-medium whitespace-nowrap shrink-0',
                  isActive
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-neutral-400 hover:bg-white/10 hover:text-white',
                )}
              >
                <span>{link.label === 'Inspect' ? 'Inspector' : link.label}</span>
                {link.id === 'optimizer' && busy && (
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                )}
              </button>
            );
          })}
        </div>

        <span className="mx-1 h-3.5 w-px bg-white/10 block shrink-0" />

        {/* Action Button: Sign In / Member Profile */}
        {memberPreview && ownerAuthenticated ? (
          <div className="relative shrink-0 ml-0.5">
            <button
              type="button"
              onClick={() => setShowUserMenu((v) => !v)}
              className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white backdrop-blur-md hover:border-white/30 transition-all sm:px-3 sm:py-1.5 sm:text-[13px]"
            >
              <UserIcon width={12} height={12} />
              <span className="hidden sm:inline max-w-[80px] truncate">{currentUserName || 'Member'}</span>
              <ChevronDownIcon width={10} height={10} />
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-white/15 bg-neutral-900/95 backdrop-blur-xl p-2 shadow-2xl z-50 text-xs">
                  <div className="px-3 py-2 border-b border-white/10">
                    <span className="text-[10px] text-neutral-400 block font-mono">Signed in as</span>
                    <strong className="text-white truncate block">{currentUserName || 'Member'}</strong>
                  </div>
                  {isMasterOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenAdmin();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/10 rounded-lg text-white/90 hover:text-white"
                    >
                      <PremiumKeyIcon width={13} height={13} />
                      <span>Passes &amp; Referrals</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onSignOut();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-rose-500/10 rounded-lg text-rose-400"
                  >
                    <LogoutIcon width={13} height={13} />
                    <span>Sign out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="shrink-0 ml-0.5">
            <RingLink
              href="#optimizer"
              onClick={(e) => {
                e.preventDefault();
                onOpenSignIn();
              }}
              innerClassName="bg-white/10 px-2.5 py-1 text-xs text-white backdrop-blur-md sm:px-3.5 sm:py-1.5 sm:text-[13px] border border-white/15 hover:bg-white/20 font-medium"
            >
              Sign in
              <ArrowUpRight className="size-3" />
            </RingLink>
          </div>
        )}
      </div>
    </nav>
  );
};

export const Hero = ({ onOpenSignIn, onSwitchTab }) => {
  const [roleIndex, setRoleIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setRoleIndex((i) => (i + 1) % ROLES.length), ROLE_INTERVAL);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      id="home"
      className="relative flex h-[100svh] min-h-[580px] w-full flex-col items-center justify-center overflow-hidden pt-20 pb-12 sm:pt-24 sm:pb-16"
    >
      {/* Background Ambient Video Layer */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <video
          src="/media/portfolio/background.mp4"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 size-full min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[hsl(var(--bg))] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[hsl(var(--bg))] to-transparent" />
      </div>

      {/* Main Hero Content (Hirael Portfolio Layout) */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center max-w-3xl mx-auto">
        <span className="mb-4 sm:mb-6 text-[11px] sm:text-xs tracking-[0.25em] text-[hsl(var(--muted))] uppercase font-mono">
          Collection &rsquo;26 · Studio Mastering
        </span>

        <h1 className="font-display mb-4 sm:mb-6 text-6xl sm:text-7xl md:text-8xl lg:text-9xl leading-[0.92] tracking-tight italic font-light text-white">
          Obito Studio
        </h1>

        <p className="mb-3 text-base sm:text-lg md:text-xl text-[hsl(var(--text))]">
          Engineered for{' '}
          <span
            key={roleIndex}
            className="animate-role-fade-in font-display inline-block text-white italic underline decoration-white/30 decoration-1 underline-offset-4"
          >
            {ROLES[roleIndex]}
          </span>
          .
        </p>

        <p className="mb-8 sm:mb-10 max-w-lg md:max-w-xl text-xs sm:text-sm md:text-base text-[hsl(var(--muted))] leading-relaxed font-sans">
          Defeating TikTok compression algorithms through pure stream-copy container surgery, 19200 timescale harmonization, and native Apple Dolby Vision Rec.2020 preservation.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3.5 sm:gap-5 mt-2">
          <button
            type="button"
            onClick={() => onSwitchTab?.('optimizer')}
            className="group relative inline-flex shrink-0 cursor-pointer transition-transform duration-300 hover:scale-105"
          >
            <span className="relative inline-flex items-center justify-center gap-1.5 rounded-full bg-white px-7 py-3 text-xs sm:text-sm font-semibold text-neutral-950 hover:bg-neutral-200 shadow-xl transition-all">
              Master Video
            </span>
          </button>

          <RingLink
            href="#compare"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('compare');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            outerClassName="transition-transform duration-300 hover:scale-105"
            innerClassName="border border-white/20 bg-white/5 px-7 py-3 text-xs sm:text-sm text-white hover:bg-white/10 hover:border-white/40 backdrop-blur-md font-medium"
          >
            Quality Comparison
          </RingLink>
        </div>
      </div>

      {/* Scroll Down Indicator */}
      <div className="absolute bottom-5 sm:bottom-7 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 sm:gap-2.5">
        <span className="text-[10px] tracking-[0.25em] text-[hsl(var(--muted))] uppercase font-mono">Scroll</span>
        <span className="relative block h-8 sm:h-9 w-px overflow-hidden bg-[hsl(var(--stroke))]">
          <span className="pf-gradient animate-scroll-down absolute inset-x-0 top-0 block h-1/2 w-full" />
        </span>
      </div>
    </section>
  );
};
