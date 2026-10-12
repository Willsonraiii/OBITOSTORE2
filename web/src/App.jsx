import { useCallback, useEffect, useRef, useState } from 'react';
import Logo from './Logo.jsx';
import Optimizer, { BotStage } from './Optimizer.jsx';
import { ThinkingOrb } from 'thinking-orbs';
import Inspector from './Inspector.jsx';
import Library from './Library.jsx';
import AdminPassesModal from './AdminPassesModal.jsx';
import { ShaderAnimation } from '@/components/ui/shader-animation';
import Guide from './Guide.jsx';
import {
  ChevronIcon, FpsIcon, HdrIcon, HelpIcon,
  InspectIcon, LayersIcon, LightningIcon, ShieldIcon, SparkIcon, FilmIcon,
  PremiumKeyIcon, UserIcon, LogoutIcon, ChevronDownIcon, BookOpenIcon
} from './icons.jsx';
import { ShutterText } from '@/components/ui/hero-shutter-text.jsx';
import { AnimatedText } from '@/components/ui/animated-text.jsx';

const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };

const TABS = [
  { id: 'optimizer', label: 'Optimizer', Icon: LightningIcon },
  { id: 'guide', label: 'Guide', Icon: BookOpenIcon },
  { id: 'inspect', label: 'Inspector', Icon: InspectIcon },
  { id: 'library', label: 'Library', Icon: FilmIcon },
  { id: 'architecture', label: 'Specs', Icon: LayersIcon },
  { id: 'faq', label: 'FAQ', Icon: HelpIcon },
];

/* ---------- Technical Architecture Content ---------- */
const ARCH_PILLARS = [
  {
    Icon: FpsIcon,
    title: '19200 Timescale Harmonization',
    subtitle: '60fps & 120fps TikTok Ingestion',
    desc: 'TikTok\'s transcode engine aggressively enforces specific timescale multiples (19200, 15360). When footage arrives with non-standard timescales (e.g. 60000/1001 or 1000/1), TikTok\'s ingestion pipeline flattens playback to 30fps. Obito Studio remuxes container atoms to exact 19200 fractions without touching video frames.'
  },
  {
    Icon: LayersIcon,
    title: 'Zero Generational Loss',
    subtitle: '-c copy Pure Stream Copy',
    desc: 'Standard transcoders decompress every frame and re-compress with lossy encoders (libx264/libx265), degrading high-frequency textures and edge sharpness. Obito Studio never touches compressed video or audio packets. Only moov/trak headers are modified, preserving 100% of master bitrate.'
  },
  {
    Icon: HdrIcon,
    title: 'Apple Dolby Vision Profile 8 Demuxing',
    subtitle: 'Dynamic RPU → Native HLG Rec.2020',
    desc: 'iPhone HDR videos embed Dolby Vision Profile 8.4 dynamic metadata (RPU). TikTok strips unhandled Dolby Vision atoms, causing washed-out, blown-out SDR playback. Obito Studio extracts and translates container color primaries to native HLG (arib-std-b67) so peak nits survive.'
  },
  {
    Icon: ShieldIcon,
    title: 'Self-Hosted Sovereign Security',
    subtitle: 'Zero Cloud Storage · Immediate Purge',
    desc: 'Your creative masters never leave your private machine or network. Temporary container remuxing operates in-memory or on local NVMe, and files are automatically purged immediately after download or within one hour of inactivity.'
  }
];

const WORKFLOW_STEPS = [
  {
    step: '01',
    name: 'Master Video Selection',
    detail: 'Import any MP4, MOV, or M4V up to 600 MB. Instant on-device container probing verifies resolution, frame-rate, color transfer, and Dolby Vision metadata before uploading.'
  },
  {
    step: '02',
    name: 'Hardware-Accelerated Stream Remux',
    detail: 'Resumable chunked ingestion streams to your server. The lossless pipeline restructures MP4 box atom layouts, interleaves audio streams, and normalizes duration timescale.'
  },
  {
    step: '03',
    name: 'Publish via TikTok Studio',
    detail: 'Download the verified master MP4 and publish directly through TikTok Studio (Desktop or Web). TikTok acknowledges the 19200 timescale and serves high-bitrate 60fps & HDR.'
  }
];

const FAQ_ITEMS = [
  [
    'Does Obito Studio re-encode or compress my footage?',
    'Never. Obito Studio strictly executes stream-copy remuxing (`-c copy`). Video packets and audio streams remain bit-for-bit identical to your export master. Zero generational degradation occurs.'
  ],
  [
    'Which preset should I select?',
    'Select "Apple HDR & Dolby Vision" for any iPhone HDR, 10-bit Log, or Dolby Vision clips to prevent TikTok from stripping wide color gamut information. Select "Standard Lossless" for SDR, gaming captures, and standard screen recordings.'
  ],
  [
    'What happens if my connection drops during upload?',
    'Uploads are chunked and completely resumable. Received data chunks remain safely cached on your server for up to one hour. Re-selecting the file or tapping Resume continues instantly without restarting.'
  ],
  [
    'Why do some local video players display 00:00 duration?',
    'The remuxed MP4 contains a specialized dual-audio timescale structure engineered specifically for TikTok\'s ingestion pipeline. Some legacy desktop video players show 00:00, but TikTok\'s mobile app and TikTok Studio parse the duration with 100% precision.'
  ],
  [
    'What are the supported file sizes and formats?',
    'MP4, MOV, and M4V containers up to 600 MB. 30 fps, 60 fps, and 120 fps portrait (9:16) and landscape masters are fully supported.'
  ],
  [
    'Are my video files stored on remote servers?',
    'No. Obito Studio operates on your self-hosted instance. Files are never sent to third-party cloud services and are deleted automatically as soon as you download the result.'
  ]
];

const HERO_MESSAGES = [
  {
    title: 'TIKTOK LOSSLESS MASTER',
    sub: 'Preserve native high FPS (60fps, 120fps+) & HDR with zero TikTok compression.'
  },
  {
    title: '60FPS NATIVE FLUIDITY',
    sub: 'Never let TikTok downgrade your high frame-rate mobile edits to 30fps.'
  },
  {
    title: '100% BIT-FOR-BIT LOSSLESS',
    sub: 'Pure stream-copy remuxing — video packets and audio streams stay untouched.'
  },
  {
    title: 'APPLE HDR & DOLBY VISION',
    sub: 'Original 10-bit color gamut intact for crystal-clear smartphone playback.'
  },
  {
    title: '19200 TIMESCALE REMUX',
    sub: 'Timescale container structure engineered specifically for TikTok ingestion.'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('optimizer'); // optimizer | inspect | library | architecture | faq
  const [apiKey, setApiKey] = useState(() => lsGet('obitoKey') || '');
  const [busy, setBusy] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  // Owner sign-in uses the site's existing server access code.
  const memberPreview = true;
  const [ownerAuthenticated, setOwnerAuthenticated] = useState(false);
  const [isMasterOwner, setIsMasterOwner] = useState(false);
  const [currentUserName, setCurrentUserName] = useState(() => lsGet('obitoUserName') || '');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberModalMode, setMemberModalMode] = useState('login'); // 'login' | 'referral' | 'referral_success'
  const [demoClientId, setDemoClientId] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [referralNameInput, setReferralNameInput] = useState('');
  const [referralRedeemedCreds, setReferralRedeemedCreds] = useState(null);
  const [referralError, setReferralError] = useState('');
  const [redeemingRef, setRedeemingRef] = useState(false);
  const [focusedMemberField, setFocusedMemberField] = useState(null);
  const memberOrbState = !demoClientId.trim() && !demoCode.trim()
    ? 'breathing' // The package's calm idle state; it does not provide a "thinking" state.
    : demoClientId.trim() && demoCode.trim()
    ? 'solving' // Both fields completed; real credential validity is not checked in this UI preview.
    : focusedMemberField === 'code' ? 'searching' : 'working';
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [now, setNow] = useState(() => new Date());
  const [heroMsgIndex, setHeroMsgIndex] = useState(0);
  const [brandKey, setBrandKey] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroMsgIndex((prev) => (prev + 1) % HERO_MESSAGES.length);
    }, 4800);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const onKeyChange = useCallback((v, userName = '') => {
    setApiKey(v);
    lsSet('obitoKey', v);
    if (userName) {
      setCurrentUserName(userName);
      lsSet('obitoUserName', userName);
    } else if (!v) {
      setCurrentUserName('');
      lsSet('obitoUserName', '');
    }
  }, []);

  useEffect(() => {
    if (!apiKey) { setOwnerAuthenticated(false); setIsMasterOwner(false); setAuthChecking(false); return; }
    const controller = new AbortController();
    setAuthChecking(true);
    fetch('/api/auth/owner', { headers: { 'x-access-token': apiKey }, signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (!controller.signal.aborted) {
          const ok = data && data.ok === true;
          setOwnerAuthenticated(ok);
          setIsMasterOwner(Boolean(data?.isOwner));
          if (data?.name || data?.clientId) {
            const displayName = data.name || data.clientId;
            setCurrentUserName(displayName);
            lsSet('obitoUserName', displayName);
          }
        }
      })
      .catch(() => { if (!controller.signal.aborted) { setOwnerAuthenticated(false); setIsMasterOwner(false); } })
      .finally(() => { if (!controller.signal.aborted) setAuthChecking(false); });
    return () => controller.abort();
  }, [apiKey]);

  const signInOwner = async (e) => {
    e.preventDefault();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setLoginError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientId: demoClientId.trim(), accessCode: demoCode.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setLoginError(data.error || 'Client ID or access code is incorrect.');
        return;
      }
      const displayName = data.name || data.clientId || demoClientId.trim();
      onKeyChange(demoCode.trim(), displayName);
      setOwnerAuthenticated(true);
      setIsMasterOwner(Boolean(data.isOwner));
      setDemoCode('');
      setDemoClientId('');
      setShowMemberModal(false);
    } catch {
      setLoginError('Could not reach the server. Try again.');
    }
  };

  const redeemReferral = async (e) => {
    e.preventDefault();
    setReferralError('');
    if (!referralCodeInput.trim()) return;
    try {
      setRedeemingRef(true);
      const res = await fetch('/api/auth/redeem-referral', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          referralCode: referralCodeInput.trim(),
          name: referralNameInput.trim()
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to redeem referral code');
      setReferralRedeemedCreds(data);
      setMemberModalMode('referral_success');
    } catch (err) {
      setReferralError(err.message || 'Could not redeem referral code.');
    } finally {
      setRedeemingRef(false);
    }
  };

  // 3D perspective mouse tracking over topbar
  const onTopbarMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    setTilt({
      x: Math.max(-1, Math.min(1, dx)),
      y: Math.max(-1, Math.min(1, dy))
    });
  };

  const onTopbarLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  // Ref to the dock container and active pill slider
  const dockBarRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, ready: false });
  const [dragOffset, setDragOffset] = useState(0);

  // Measure and align sliding glass pill indicator
  const [hoveredTab, setHoveredTab] = useState(null);

  // Measure and align sliding glass pill indicator
  const updatePill = useCallback(() => {
    if (!dockBarRef.current) return;
    const targetTab = hoveredTab || activeTab;
    const activeBtn = dockBarRef.current.querySelector(`.ios-dock-item[data-tab-id="${targetTab}"]`);
    if (activeBtn) {
      setIndicatorStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
        ready: true,
        dragging: !!hoveredTab
      });
    }
  }, [activeTab, hoveredTab]);

  useEffect(() => {
    updatePill();
    window.addEventListener('resize', updatePill);
    return () => window.removeEventListener('resize', updatePill);
  }, [updatePill]);

  const suppressClickRef = useRef(false);

  const switchTabWithHaptic = useCallback((tabId) => {
    setActiveTab((prev) => {
      if (prev !== tabId) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) try { navigator.vibrate(12); } catch {}
        return tabId;
      }
      return prev;
    });
  }, []);

  const onDockTouchStart = (e) => {
    if (e.touches && e.touches.length === 1) {
      const t = e.touches[0];
      if (dockBarRef.current) {
        const rect = dockBarRef.current.getBoundingClientRect();
        setDragOffset(Math.max(0, Math.min(t.clientX - rect.left, rect.width)));
      }
      const el = document.elementFromPoint(t.clientX, t.clientY);
      const tabBtn = el?.closest('.ios-dock-item');
      if (tabBtn) setHoveredTab(tabBtn.getAttribute('data-tab-id'));
    }
  };

  const onDockTouchMove = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    if (e.cancelable) e.preventDefault();
    const t = e.touches[0];
    if (dockBarRef.current) {
      const rect = dockBarRef.current.getBoundingClientRect();
      setDragOffset(Math.max(0, Math.min(t.clientX - rect.left, rect.width)));
    }
    const el = document.elementFromPoint(t.clientX, t.clientY);
    const tabBtn = el?.closest('.ios-dock-item');
    if (tabBtn) {
      const tabId = tabBtn.getAttribute('data-tab-id');
      if (tabId !== hoveredTab) {
        setHoveredTab(tabId);
        if (typeof navigator !== 'undefined' && navigator.vibrate) try { navigator.vibrate(6); } catch {}
      }
    } else {
      setHoveredTab(null);
    }
  };

  const onDockTouchEnd = (e) => {
    if (hoveredTab) {
      switchTabWithHaptic(hoveredTab);
      suppressClickRef.current = true;
      setTimeout(() => suppressClickRef.current = false, 300);
    }
    setHoveredTab(null);
    setDragOffset(0);
  };

  const dayStr = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="studio-app relative">
      <ShaderAnimation />
      {/* ---------- Ultra-Premium Studio Top Bar with Frameless Living Logo ---------- */}
      <header
        className="studio-topbar"
        onPointerMove={onTopbarMove}
        onPointerLeave={onTopbarLeave}
      >
        {/* Left Segment: Brand */}
        <div className="topbar-left">
          <div
            className="studio-brand brand-stacked"
            onClick={() => {
              setActiveTab('optimizer');
            }}
            title="OBITO STUDIO"
          >
            <div className="brand-obito">
              <AnimatedText
                text="OBITO"
                fontSize={14}
                minWeight={120}
                maxWeight={850}
                animationDuration={1.8}
                delayMultiplier={0.16}
                phaseOffset={0}
                reverse={false}
                justify={false}
                color="#ffffff"
                letterSpacing="0.08em"
              />
            </div>
            <div className="brand-studio">
              <AnimatedText
                text="STUDIO"
                fontSize={10.5}
                minWeight={200}
                maxWeight={820}
                animationDuration={1.8}
                delayMultiplier={0.16}
                phaseOffset={-0.9}
                reverse={true}
                justify={false}
                color="rgba(255, 255, 255, 0.78)"
                letterSpacing="0.22em"
              />
            </div>
          </div>
        </div>

        {/* Center Segment: Frameless 3D Living Monogram (At Mid) */}
        <div className="topbar-center">
          <button
            type="button"
            className="topbar-logo-btn"
            style={{
              transform: `perspective(360px) rotateY(${tilt.x * 14}deg) rotateX(${-tilt.y * 12}deg)`
            }}
            onClick={() => {
              setActiveTab('optimizer');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            aria-label="OBITO STUDIO"
          >
            <Logo size={42} />
          </button>
        </div>

        {/* Right Segment: Access Key & Clock */}
        <div className="topbar-right">
          {memberPreview && ownerAuthenticated && (
            <div className="topbar-user-menu-wrap">
              <button
                type="button"
                className={`key-badge-btn configured user-profile-btn ${showUserMenu ? 'active' : ''}`}
                onClick={() => setShowUserMenu((v) => !v)}
                title="Account Menu"
                aria-expanded={showUserMenu}
              >
                <UserIcon width={13} height={13} />
                <span className="user-name-text">{currentUserName || 'Member'}</span>
                <ChevronDownIcon width={11} height={11} className={`user-menu-arrow ${showUserMenu ? 'open' : ''}`} />
              </button>

              {showUserMenu && (
                <>
                  <div className="user-menu-backdrop" onClick={() => setShowUserMenu(false)} />
                  <div className="user-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                    <div className="user-dropdown-header">
                      <span className="user-dropdown-label">Signed in as</span>
                      <strong className="user-dropdown-name">{currentUserName || 'Member'}</strong>
                    </div>

                    <div className="user-dropdown-divider" />

                    {isMasterOwner && (
                      <button
                        type="button"
                        className="user-dropdown-item admin"
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowAdminModal(true);
                        }}
                      >
                        <PremiumKeyIcon width={14} height={14} />
                        <span>Passes & Referrals</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="user-dropdown-item signout"
                      onClick={() => {
                        setShowUserMenu(false);
                        onKeyChange('');
                        setOwnerAuthenticated(false);
                        setIsMasterOwner(false);
                        setActiveTab('optimizer');
                      }}
                    >
                      <LogoutIcon width={14} height={14} />
                      <span>Sign out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {!memberPreview && <button
            type="button"
            className={`key-badge-btn ${apiKey ? 'configured' : ''}`}
            onClick={() => setShowKeyModal((v) => !v)}
            title="Configure Server Access Key"
            aria-label="Server Access Key"
          >
            <PremiumKeyIcon width={15} height={15} />
            <span className="key-btn-text">{apiKey ? 'Key Set' : 'Key'}</span>
          </button>}

          <div className="studio-clock" aria-label="Local Time">
            <span className="clock-day">{dayStr}</span>
            <span className="clock-time">{timeStr}</span>
          </div>
        </div>
      </header>

      {/* Admin Passes Management Modal */}
      {showAdminModal && (
        <AdminPassesModal apiKey={apiKey} onClose={() => setShowAdminModal(false)} />
      )}

      {/* Access Key Popover Modal */}
      {showKeyModal && (
        <div className="modal-backdrop" onClick={() => setShowKeyModal(false)}>
          <div className="studio-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Server Access Token</span>
              <button type="button" className="modal-close" onClick={() => setShowKeyModal(false)}>×</button>
            </div>
            <p className="modal-desc">
              If your self-hosted Obito Studio instance requires authentication, enter your access token here.
            </p>
            <input
              type="password"
              className="studio-input"
              placeholder="Enter server access token"
              value={apiKey}
              onChange={(e) => onKeyChange(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button type="button" className="btn-studio primary" onClick={() => setShowKeyModal(false)}>
                Save Token
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Main Workspace Viewport ---------- */}
      <main className="studio-workspace">
        {activeTab === 'optimizer' && (
          <section className={`workspace-view active optimizer-view ${busy ? 'is-busy' : ''} ${memberPreview && !ownerAuthenticated ? (showMemberModal ? 'member-signin-view' : 'member-locked-view') : ''}`} key="optimizer">
            <div className="hero-banner text-center mb-6">
              <h1
                className="hero-headline text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tighter text-white mb-2 cursor-pointer select-none"
                style={{ color: "#ffffff", WebkitTextFillColor: "#ffffff" }}
                onClick={() => setHeroMsgIndex((prev) => (prev + 1) % HERO_MESSAGES.length)}
                title="Click to cycle message"
              >
                <ShutterText
                  text={HERO_MESSAGES[heroMsgIndex].title}
                  triggerKey={heroMsgIndex}
                  textClassName="text-[clamp(1.4rem,3.8vw,3.25rem)] font-extrabold tracking-tight"
                  textColor="#ffffff"
                  topSliceColor="#38bdf8"
                  midSliceColor="#cbd5e1"
                  botSliceColor="#818cf8"
                />
              </h1>
              <p className="hero-subline text-white/70 text-xs sm:text-sm md:text-base max-w-xl mx-auto mb-3 transition-opacity duration-300">
                {HERO_MESSAGES[heroMsgIndex].sub}
              </p>
            </div>

            {memberPreview && authChecking ? (
              <div className="dropzone-sub">Checking access…</div>
            ) : memberPreview && !ownerAuthenticated ? (
              <div className="studio-optimizer w-full max-w-3xl mx-auto">
                <div className="clean-dropzone phase-idle">
                  {!showMemberModal ? <>
                    <BotStage phase="idle" busy={false} />
                    <div className="dropzone-text">
                      <h2 className="dropzone-title">Choose a video to optimize</h2>
                      <p className="dropzone-sub">Sign in with an active membership to upload a video.</p>
                    </div>
                    <div className="idle-actions">
                      <div className="choose-btn-wrap my-3">
                        <button type="button" className="btn-primary-hero choose-file-label" onClick={() => setShowMemberModal(true)}><PremiumKeyIcon width={18} height={18} /><span>Sign in to optimize</span></button>
                      </div>
                    </div>
                  </> : memberModalMode === 'referral' ? <>
                    <div className="member-orb" aria-label="Redeeming referral pass">
                      <ThinkingOrb state={redeemingRef ? 'working' : 'searching'} size={64} theme="dark" />
                    </div>
                    <div className="dropzone-text">
                      <h2 className="dropzone-title">Redeem Referral Code</h2>
                      <p className="dropzone-sub">Enter the invite or referral code you received.</p>
                    </div>
                    <form className="member-inline-form" onSubmit={redeemReferral}>
                      <label htmlFor="ref-code">Referral / Invite Code</label>
                      <input
                        id="ref-code"
                        className="studio-input"
                        placeholder="e.g. OBITO-VIP or VIP-CODE"
                        value={referralCodeInput}
                        onChange={(e) => { setReferralCodeInput(e.target.value); setReferralError(''); }}
                        required
                        autoFocus
                      />
                      <label htmlFor="ref-name">Your Name / Handle (Optional)</label>
                      <input
                        id="ref-name"
                        className="studio-input"
                        placeholder="e.g. Alex"
                        value={referralNameInput}
                        onChange={(e) => setReferralNameInput(e.target.value)}
                      />
                      <div className="member-inline-actions">
                        <button type="submit" className="btn-primary-hero choose-file-label" disabled={redeemingRef}>
                          {redeemingRef ? 'Activating…' : 'Redeem Pass →'}
                        </button>
                        <button type="button" className="btn-secondary" onClick={() => { setMemberModalMode('login'); setReferralError(''); }}>
                          Back
                        </button>
                      </div>
                      {referralError && <p className="member-login-error" role="alert">{referralError}</p>}
                    </form>
                  </> : memberModalMode === 'referral_success' && referralRedeemedCreds ? <>
                    <div className="member-orb">
                      <ThinkingOrb state="solving" size={64} theme="dark" />
                    </div>
                    <div className="dropzone-text">
                      <h2 className="dropzone-title">🎉 Access Pass Activated!</h2>
                      <p className="dropzone-sub">Your personal client credentials have been created.</p>
                    </div>
                    <div className="member-success-card">
                      <div className="success-cred-row">
                        <span className="cred-label">Client ID:</span>
                        <span className="cred-val">{referralRedeemedCreds.clientId}</span>
                      </div>
                      <div className="success-cred-row">
                        <span className="cred-label">Access Code:</span>
                        <span className="cred-val code-highlight">{referralRedeemedCreds.accessCode}</span>
                      </div>
                      <p className="success-save-hint">Save these credentials or click below to enter directly.</p>
                    </div>
                    <div className="member-inline-actions">
                      <button
                        type="button"
                        className="btn-primary-hero choose-file-label"
                        onClick={() => {
                          const displayName = referralRedeemedCreds.name || referralRedeemedCreds.clientId;
                          onKeyChange(referralRedeemedCreds.accessCode, displayName);
                          setOwnerAuthenticated(true);
                          setShowMemberModal(false);
                          setMemberModalMode('login');
                          setReferralRedeemedCreds(null);
                        }}
                      >
                        Enter Studio & Save Pass →
                      </button>
                    </div>
                  </> : <>
                    <div className="member-orb" aria-label={`Sign-in progress: ${memberOrbState}`}>
                      <ThinkingOrb state={memberOrbState} size={64} theme="dark" />
                    </div>
                    <div className="dropzone-text">
                      <h2 className="dropzone-title">Sign in to optimize</h2>
                      <p className="dropzone-sub">Enter your personal Client ID & Access code.</p>
                    </div>
                    <form className="member-inline-form" onSubmit={signInOwner}>
                      <label htmlFor="member-id">Client ID</label>
                      <input id="member-id" className="studio-input" placeholder="Your client ID" autoComplete="off" value={demoClientId} onFocus={() => setFocusedMemberField('id')} onBlur={() => setFocusedMemberField(null)} onChange={(e) => { setDemoClientId(e.target.value); }} required />
                      <label htmlFor="member-code">Access code</label>
                      <input id="member-code" className="studio-input" placeholder="Your access code" type="password" autoComplete="off" value={demoCode} onFocus={() => setFocusedMemberField('code')} onBlur={() => setFocusedMemberField(null)} onChange={(e) => { setDemoCode(e.target.value); }} required />
                      <div className="member-inline-actions">
                        <button type="submit" className="btn-primary-hero choose-file-label">Continue</button>
                        <button type="button" className="btn-secondary" onClick={() => { setShowMemberModal(false); setDemoCode(''); }}>Back</button>
                      </div>
                      <div className="member-request">
                        <div className="referral-prompt-row">
                          <span>Have a referral or invite code?</span>
                          <button type="button" className="member-link-btn" onClick={() => { setMemberModalMode('referral'); setReferralError(''); }}>Redeem referral code →</button>
                        </div>
                        <div className="whatsapp-prompt-row">
                          <span>Don’t have an access code?</span>
                          <a
                            href="https://wa.me/9779813952103?text=Hi%2C%20I%20would%20like%20to%20request%20an%20access%20code%20for%20Obito%20Studio."
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary"
                          >
                            Request access code →
                          </a>
                        </div>
                      </div>
                      {loginError && <p className="member-login-error" role="alert">{loginError}</p>}
                    </form>
                  </>}
                </div>
              </div>
            ) : <Optimizer apiKey={apiKey} onKeyChange={onKeyChange} onBusy={setBusy} />}
          </section>
        )}

        {activeTab === 'guide' && (
          <section className="workspace-view active" key="guide">
            <Guide onSwitchToOptimizer={() => setActiveTab('optimizer')} />
          </section>
        )}

        {activeTab === 'inspect' && (
          <section className="workspace-view active" key="inspect">
            <div className="section-head">
              <div className="head-badge">
                <InspectIcon width={14} height={14} />
                <span>CODEC AUDIT</span>
              </div>
              <h2 className="head-title">TikTok Codec Inspector</h2>
              <p className="head-sub">
                Audit video containers, timescale, 60fps/120fps, and HDR color metadata.
              </p>
            </div>
            <Inspector apiKey={apiKey} />
          </section>
        )}

        {activeTab === 'library' && (
          <section className="workspace-view active" key="library">
            <div className="section-head">
              <div className="head-badge">
                <FilmIcon width={14} height={14} />
                <span>SERVER STORAGE AUDIT</span>
              </div>
              <h2 className="head-title">Lossless Export Master Library</h2>
              <p className="head-sub">
                Review recently repackaged masters and cached uploads currently staged in local server memory.
              </p>
            </div>
            <Library apiKey={apiKey} />
          </section>
        )}

        {activeTab === 'architecture' && (
          <section className="workspace-view active" key="architecture">
            <div className="section-head">
              <div className="head-badge">
                <LayersIcon width={14} height={14} />
                <span>TECHNICAL SPECIFICATIONS</span>
              </div>
              <h2 className="head-title">Engine Architecture &amp; Methodology</h2>
              <p className="head-sub">
                How Obito Studio preserves full 60/120fps motion fluidity and wide dynamic range without transcoding.
              </p>
            </div>

            <div className="pillars-grid">
              {ARCH_PILLARS.map(({ Icon, title, subtitle, desc }) => (
                <div className="pillar-card" key={title}>
                  <div className="pillar-header">
                    <div className="pillar-icon">
                      <Icon width={22} height={22} />
                    </div>
                    <div>
                      <h3 className="pillar-title">{title}</h3>
                      <span className="pillar-sub">{subtitle}</span>
                    </div>
                  </div>
                  <p className="pillar-desc">{desc}</p>
                </div>
              ))}
            </div>

            <div className="workflow-section">
              <h3 className="sub-title">Three-Phase Mastering Pipeline</h3>
              <div className="workflow-grid">
                {WORKFLOW_STEPS.map(({ step, name, detail }) => (
                  <div className="workflow-card" key={step}>
                    <span className="wf-step">{step}</span>
                    <h4 className="wf-name">{name}</h4>
                    <p className="wf-detail">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'faq' && (
          <section className="workspace-view active" key="faq">
            <div className="section-head">
              <div className="head-badge">
                <HelpIcon width={14} height={14} />
                <span>OPERATIONAL FAQ</span>
              </div>
              <h2 className="head-title">Frequently Asked Questions</h2>
              <p className="head-sub">
                Everything you need to know about timescale remuxing, bitrates, and privacy.
              </p>
            </div>

            <div className="faq-container">
              {FAQ_ITEMS.map(([q, a]) => (
                <details className="faq-item" key={q}>
                  <summary className="faq-question">
                    <span>{q}</span>
                    <ChevronIcon width={18} height={18} />
                  </summary>
                  <p className="faq-answer">{a}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ---------- Studio Footer ---------- */}
      <footer className="studio-footer">
        <div className="footer-left">
          <Logo size={20} />
          <span>OBITO STUDIO · High-Performance Lossless Video Mastering Suite</span>
        </div>
        <div className="footer-right">
          <span>Bit-for-Bit Stream Copy · 19200 Timescale · DOVI Profile 8.4</span>
        </div>
      </footer>

      {/* ---------- iOS Vision Clear Glass Bottom Dock ---------- */}
      <nav
        className="ios-dock-wrap"
        aria-label="Studio Tools Menu"
        onTouchStart={onDockTouchStart}
        onTouchMove={onDockTouchMove}
        onTouchEnd={onDockTouchEnd}
        onTouchCancel={() => { setDragOffset(0); setHoveredTab(null); }}
      >
        <div
          className="ios-dock-bar"
          ref={dockBarRef}
        >
          {/* Animated Clear Glass Sliding Pill Lens (Uniform size across all tabs) */}
          {indicatorStyle.ready && (
            <div
              className={`ios-dock-pill-slider ${dragOffset > 0 ? 'dragging' : ''}`}
              style={{
                transform: `translateX(${dragOffset > 0 ? dragOffset - (indicatorStyle.width / 2) : indicatorStyle.left}px)`,
                width: `${indicatorStyle.width}px`
              }}
            />
          )}

          {TABS.map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                data-tab-id={id}
                className={`ios-dock-item ${active ? 'active' : ''} ${hoveredTab === id ? 'hovered' : ''}`}
                onClick={(e) => {
                  if (suppressClickRef.current) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  switchTabWithHaptic(id);
                }}
                aria-label={label}
              >
                <div className="dock-icon-wrap">
                  <Icon width={21} height={21} />
                  {id === 'optimizer' && busy && <span className="dock-pulse" />}
                </div>
                <span className="dock-label">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
