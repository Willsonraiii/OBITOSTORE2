import React from 'react';
import { Navbar, Hero } from './Hero';
import { VideoComparison } from './VideoComparison';
import { Stats } from './Stats';
import { Contact } from './Contact';
import Optimizer, { BotStage } from '../Optimizer';
import Dashboard from '../Dashboard';
import Inspector from '../Inspector';
import Guide from '../Guide';
import { SectionHeader } from './primitives';
import { ChevronIcon, PremiumKeyIcon } from '../icons';

export default function PortfolioView({
  activeTab,
  onSwitchTab,
  apiKey,
  onKeyChange,
  busy,
  setBusy,
  memberPreview,
  authChecking,
  ownerAuthenticated,
  currentUserName,
  isMasterOwner,
  onOpenSignIn,
  onOpenAdmin,
  onSignOut,
  archPillars,
  workflowSteps,
  faqItems,
}) {
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'instant' }), 50);
      }
    }
  }, [activeTab]);

  return (
    <div
      data-slot="portfolio"
      className="min-h-screen bg-[hsl(var(--bg))] text-[hsl(var(--text))] antialiased selection:bg-white/20"
    >
      {/* Floating Hirael Pill Navbar */}
      <Navbar
        activeTab={activeTab}
        onSwitchTab={onSwitchTab}
        busy={busy}
        memberPreview={memberPreview}
        ownerAuthenticated={ownerAuthenticated}
        currentUserName={currentUserName}
        isMasterOwner={isMasterOwner}
        onOpenSignIn={onOpenSignIn}
        onOpenAdmin={onOpenAdmin}
        onSignOut={onSignOut}
      />

      {/* Main Homepage Flow (Strictly Showcase, No Dropzone) */}
      {activeTab === 'home' && (
        <main id="home">
          {/* 1. Hero with Looping Video Background */}
          <Hero onOpenSignIn={onOpenSignIn} onSwitchTab={onSwitchTab} />

          {/* 2. Realtime Video Swap Comparison Section */}
          <VideoComparison />

          {/* 3. Technical Architecture Foundations & Workflow Steps */}
          <section id="architecture" className="section-hirael scroll-anchor bg-[hsl(var(--bg))]">
            <div className="container-hirael">
              <SectionHeader
                eyebrow="03 · ENGINE ARCHITECTURE"
                lead="Technical"
                accent="Foundations"
                subtext="How Obito Studio enforces zero generational loss, locks 60fps & 120fps ingestion clocks, and demuxes Apple HDR."
                className="mb-8 sm:mb-12"
              />

              {/* Architecture 4 Pillars Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 mb-16 sm:mb-20">
                {archPillars?.map(({ Icon, title, subtitle, desc }) => (
                  <div
                    key={title}
                    className="rounded-3xl border border-[hsl(var(--stroke))] bg-[hsl(var(--surface))] p-5 sm:p-7 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-3.5 mb-3.5">
                      <div className="size-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0">
                        <Icon width={20} height={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm sm:text-base text-white">{title}</h3>
                        <span className="text-[11px] text-[hsl(var(--muted))] font-mono">{subtitle}</span>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-[hsl(var(--muted))] leading-relaxed font-sans">{desc}</p>
                  </div>
                ))}
              </div>

              {/* Three-Phase Mastering Pipeline */}
              <div className="border-t border-[hsl(var(--stroke))] pt-12 sm:pt-16">
                <div className="flex items-center gap-3 mb-4">
                  <span className="h-px w-8 bg-[hsl(var(--stroke))]" />
                  <span className="text-[11px] sm:text-xs tracking-[0.25em] text-[hsl(var(--muted))] uppercase font-mono">
                    Three-Phase Pipeline
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-normal text-white mb-8">
                  Container Remux <span className="font-display italic">Workflow</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {workflowSteps?.map(({ step, name, detail }) => (
                    <div
                      key={step}
                      className="rounded-2xl border border-[hsl(var(--stroke))] bg-[hsl(var(--surface))] p-5 relative overflow-hidden group hover:border-white/20 transition-all"
                    >
                      <span className="font-display text-3xl sm:text-4xl italic text-white/20 block mb-3 group-hover:text-white/40 transition-colors">
                        {step}
                      </span>
                      <h4 className="font-semibold text-sm sm:text-base text-white mb-2">{name}</h4>
                      <p className="text-xs sm:text-sm text-[hsl(var(--muted))] leading-relaxed">{detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 5. Stats Count-Up Section */}
          <Stats />

          {/* 6. Operational FAQ Section */}
          <section id="faq" className="section-hirael scroll-anchor bg-[hsl(var(--bg))]">
            <div className="container-hirael">
              <SectionHeader
                eyebrow="04 · KNOWLEDGE BASE"
                lead="Frequently Asked"
                accent="Questions"
                subtext="Everything you need to know about timescale remuxing, bitrates, privacy, and mobile upload rules."
                className="mb-8 sm:mb-12"
              />

              <div className="space-y-3.5 max-w-3xl">
                {faqItems?.map(([q, a]) => (
                  <details
                    key={q}
                    className="group rounded-2xl border border-[hsl(var(--stroke))] bg-[hsl(var(--surface))] p-4 sm:p-5 transition-all hover:border-white/20"
                  >
                    <summary className="flex cursor-pointer items-center justify-between font-medium text-xs sm:text-sm text-white/90 select-none">
                      <span>{q}</span>
                      <ChevronIcon width={14} height={14} className="transition-transform group-open:rotate-180 text-white/40 shrink-0 ml-4" />
                    </summary>
                    <p className="mt-3.5 text-xs sm:text-sm text-[hsl(var(--muted))] leading-relaxed border-t border-[hsl(var(--stroke))] pt-3.5">
                      {a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        </main>
      )}

      {/* Dedicated Optimizer Pipeline Studio Page */}
      {activeTab === 'optimizer' && (
        <main id="optimizer" className="scroll-anchor pt-28 sm:pt-32 md:pt-36 pb-20 sm:pb-28 min-h-screen">
          <div className="container-hirael">
            <SectionHeader
              eyebrow="02 · LOSSLESS PIPELINE"
              lead="Pipeline"
              accent="Studio"
              subtext="Bit-for-bit container remuxing, 19,200 timescale synchronization, and dynamic HDR translation with zero re-encoding."
              className="mb-8 sm:mb-12"
            />

            {memberPreview && authChecking ? (
              <div className="text-center py-16 text-[hsl(var(--muted))]">Checking access permissions…</div>
            ) : memberPreview && !ownerAuthenticated ? (
              <div className="rounded-3xl border border-white/10 bg-[hsl(var(--surface))] p-6 sm:p-10 md:p-14 text-center max-w-xl mx-auto shadow-2xl backdrop-blur-xl">
                <BotStage phase="idle" busy={false} />
                <h3 className="font-display text-2xl sm:text-3xl md:text-4xl italic mt-6 mb-3 text-white">Member Access Required</h3>
                <p className="text-xs sm:text-sm text-[hsl(var(--muted))] mb-8 max-w-md mx-auto leading-relaxed">
                  Sign in with an active pass to engage bit-for-bit container remuxing, 60fps cadence lock, and native Apple HDR preservation.
                </p>
                <button
                  type="button"
                  onClick={onOpenSignIn}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-xs sm:text-sm font-semibold text-black hover:bg-neutral-200 transition-all shadow-xl hover:scale-105 active:scale-95"
                >
                  <PremiumKeyIcon width={15} height={15} />
                  <span>Sign in to optimize video</span>
                </button>
              </div>
            ) : (
              <div className="w-full">
                <Optimizer apiKey={apiKey} onKeyChange={onKeyChange} onBusy={setBusy} />
              </div>
            )}
          </div>
        </main>
      )}

      {/* Dedicated Compare Tab */}
      {activeTab === 'compare' && (
        <main id="compare" className="scroll-anchor pt-28 sm:pt-32 md:pt-36 pb-20 sm:pb-28">
          <VideoComparison />
        </main>
      )}

      {/* Dedicated Inspector Tab */}
      {activeTab === 'inspect' && (
        <main id="inspect" className="scroll-anchor pt-28 sm:pt-32 md:pt-36 pb-20 sm:pb-28">
          <div className="container-hirael">
            <SectionHeader
              eyebrow="Codec Audit"
              lead="TikTok Container"
              accent="Inspector"
              subtext="Audit video containers, timescale clocks, 60fps/120fps recognition, and HDR color metadata."
              className="mb-8 sm:mb-12"
            />
            <div className="w-full">
              <Inspector apiKey={apiKey} />
            </div>
          </div>
        </main>
      )}

      {/* Dedicated Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <main id="dashboard" className="scroll-anchor pt-28 sm:pt-32 md:pt-36 pb-20 sm:pb-28">
          <div className="container-hirael">
            <SectionHeader
              eyebrow="Pipeline Telemetry"
              lead="Connected Accounts &"
              accent="Dashboard"
              subtext="Manage TikTok Content Posting authorizations, active quotas, and server telemetry."
              className="mb-8 sm:mb-12"
            />
            <div className="w-full">
              <Dashboard onSwitchTab={onSwitchTab} apiKey={apiKey} />
            </div>
          </div>
        </main>
      )}

      {/* Dedicated Guide Tab */}
      {activeTab === 'guide' && (
        <main id="guide" className="scroll-anchor pt-28 sm:pt-32 md:pt-36 pb-20 sm:pb-28">
          <div className="container-hirael">
            <SectionHeader
              eyebrow="Export Guide"
              lead="Creator"
              accent="Presets"
              subtext="Recommended timeline settings for DaVinci Resolve, Premiere Pro, and CapCut."
              className="mb-8 sm:mb-12"
            />
            <div className="w-full">
              <Guide onSwitchToOptimizer={() => onSwitchTab('optimizer')} hideHeader={true} />
            </div>
          </div>
        </main>
      )}

      {/* Dedicated Specs & FAQ Tab */}
      {activeTab === 'specs' && (
        <main id="specs" className="scroll-anchor pt-28 sm:pt-32 md:pt-36 pb-20 sm:pb-28">
          <div className="container-hirael">
            <SectionHeader
              eyebrow="Engine Specifications"
              lead="Technical"
              accent="Architecture"
              subtext="How Obito Studio preserves full 60/120fps motion fluidity and wide dynamic range without transcoding."
              className="mb-8 sm:mb-12"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 mb-12 sm:mb-16">
              {archPillars?.map(({ Icon, title, subtitle, desc }) => (
                <div
                  key={title}
                  className="rounded-3xl border border-[hsl(var(--stroke))] bg-[hsl(var(--surface))] p-5 sm:p-7 hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-3.5 mb-3.5">
                    <div className="size-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0">
                      <Icon width={20} height={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base text-white">{title}</h3>
                      <span className="text-[11px] text-[hsl(var(--muted))] font-mono">{subtitle}</span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-[hsl(var(--muted))] leading-relaxed font-sans">{desc}</p>
                </div>
              ))}
            </div>

            <SectionHeader
              eyebrow="Knowledge Base"
              lead="Frequently Asked"
              accent="Questions"
              subtext="Everything you need to know about timescale remuxing, bitrates, and sovereign processing."
              className="mb-6 sm:mb-8"
            />

            <div className="space-y-3.5 max-w-3xl">
              {faqItems?.map(([q, a]) => (
                <details
                  key={q}
                  className="group rounded-2xl border border-[hsl(var(--stroke))] bg-[hsl(var(--surface))] p-4 sm:p-5 transition-all hover:border-white/20"
                >
                  <summary className="flex cursor-pointer items-center justify-between font-medium text-xs sm:text-sm text-white/90 select-none">
                    <span>{q}</span>
                    <ChevronIcon width={14} height={14} className="transition-transform group-open:rotate-180 text-white/40 shrink-0 ml-4" />
                  </summary>
                  <p className="mt-3.5 text-xs sm:text-sm text-[hsl(var(--muted))] leading-relaxed border-t border-[hsl(var(--stroke))] pt-3.5">
                    {a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* Hirael Luxury Footer with All User Links */}
      <Contact onSwitchTab={onSwitchTab} />
    </div>
  );
}
