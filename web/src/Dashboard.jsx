import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LightningIcon, InspectIcon, BookOpenIcon,
  DashboardIcon, ShieldIcon, CheckIcon
} from './icons.jsx';

const scrollBlurCard = {
  initial: { opacity: 0.2, filter: 'blur(10px)', y: 24 },
  whileInView: { opacity: 1, filter: 'blur(0px)', y: 0 },
  viewport: { once: false, amount: 0.15, margin: "-10px 0px -40px 0px" },
  transition: { duration: 0.52, ease: [0.16, 1, 0.3, 1] }
};

const scrollBlurButton = {
  initial: { opacity: 0.25, filter: 'blur(8px)', y: 14 },
  whileInView: { opacity: 1, filter: 'blur(0px)', y: 0 },
  viewport: { once: false, amount: 0.2 },
  transition: { duration: 0.44, ease: [0.16, 1, 0.3, 1] }
};

export default function Dashboard({ onSwitchTab }) {
  const [queueStatus, setQueueStatus] = useState({ busy: false, queuedCount: 0, activeJob: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchQueue = async () => {
      try {
        const res = await fetch('/api/queue/status');
        if (res.ok) {
          const data = await res.json();
          if (mounted) {
            setQueueStatus(data);
            setLoading(false);
          }
        }
      } catch {
        if (mounted) setLoading(false);
      }
    };

    fetchQueue();
    const interval = setInterval(fetchQueue, 4000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="studio-dashboard">
      {/* ---------- Hero Master Command Center ---------- */}
      <motion.div
        className="dash-hero-card"
        initial={{ opacity: 0.3, filter: 'blur(12px)', y: 20 }}
        animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="dash-hero-top">
          <div className="dash-hero-brand">
            <span className="dash-hero-badge">STUDIO MASTER CONTROL</span>
            <span className="dash-beta-pill">BETA</span>
          </div>
          <div className={`dash-engine-status ${queueStatus.busy ? 'busy' : 'ready'}`}>
            <span className="dash-status-dot" />
            <span className="dash-status-text">
              {loading
                ? 'INITIALIZING…'
                : queueStatus.busy
                ? 'MASTER ENGINE BUSY'
                : 'ENGINE STANDBY · READY'}
            </span>
          </div>
        </div>

        <div className="dash-hero-content">
          <h1 className="dash-hero-title">Obito Video Mastering Suite</h1>
          <p className="dash-hero-subtitle">
            Bit-for-bit lossless container mastering. Preserve native 60fps and 120fps motion fluidity, 10-bit HDR wide color gamut, and master export bitrates across mobile video platforms.
          </p>
        </div>

        <div className="dash-hero-actions">
          <motion.button
            type="button"
            className="btn-dash-hero primary"
            onClick={() => onSwitchTab('optimizer')}
            {...scrollBlurButton}
          >
            <LightningIcon width={18} height={18} />
            <span>Open Lossless Optimizer</span>
            <span className="dash-arrow">→</span>
          </motion.button>
          <motion.button
            type="button"
            className="btn-dash-hero secondary"
            onClick={() => onSwitchTab('inspect')}
            {...scrollBlurButton}
            transition={{ ...scrollBlurButton.transition, delay: 0.08 }}
          >
            <InspectIcon width={18} height={18} />
            <span>Audit Video Container</span>
          </motion.button>
        </div>
      </motion.div>

      {/* ---------- Live Hardware Telemetry Matrix ---------- */}
      <div className="dash-telemetry-grid">
        <motion.div className="dash-stat-card" {...scrollBlurCard} transition={{ ...scrollBlurCard.transition, delay: 0.02 }}>
          <div className="dash-stat-header">
            <span className="dash-stat-label">MASTER PIPELINE</span>
          </div>
          <div className="dash-stat-val">
            {loading ? 'SYNCING…' : queueStatus.busy ? 'OPTIMIZING' : 'STREAM COPY'}
          </div>
          <div className="dash-stat-desc">
            {queueStatus.busy && queueStatus.activeJob?.stage
              ? `Processing: ${queueStatus.activeJob.stage}`
              : 'Pure lossless passthrough · Zero generation loss'}
          </div>
        </motion.div>

        <motion.div className="dash-stat-card" {...scrollBlurCard} transition={{ ...scrollBlurCard.transition, delay: 0.06 }}>
          <div className="dash-stat-header">
            <span className="dash-stat-label">MOTION PRESERVATION</span>
          </div>
          <div className="dash-stat-val">60 &amp; 120 FPS</div>
          <div className="dash-stat-desc">Locks native frame rates; defeats platform 30fps drop</div>
        </motion.div>

        <motion.div className="dash-stat-header-card dash-stat-card" {...scrollBlurCard} transition={{ ...scrollBlurCard.transition, delay: 0.1 }}>
          <div className="dash-stat-header">
            <span className="dash-stat-label">COLOR FIDELITY</span>
          </div>
          <div className="dash-stat-val">10-BIT HDR &amp; DOVI</div>
          <div className="dash-stat-desc">Native Wide Color Gamut &amp; peak dynamic range intact</div>
        </motion.div>

        <motion.div className="dash-stat-card" {...scrollBlurCard} transition={{ ...scrollBlurCard.transition, delay: 0.14 }}>
          <div className="dash-stat-header">
            <span className="dash-stat-label">SERVER QUEUE</span>
          </div>
          <div className="dash-stat-val">
            {loading ? '—' : queueStatus.queuedCount > 0 ? `${queueStatus.queuedCount} IN QUEUE` : '0 QUEUED'}
          </div>
          <div className="dash-stat-desc">
            {queueStatus.queuedCount > 0
              ? 'Sequential NVMe execution safely held in line'
              : 'Direct NVMe streaming · Zero wait time'}
          </div>
        </motion.div>
      </div>

      {/* ---------- Mastering Workflows ---------- */}
      <div className="dash-workflows-section">
        <motion.div className="dash-section-header" {...scrollBlurCard}>
          <h2 className="dash-section-title">Mastering Workflows</h2>
          <span className="dash-section-sub">Direct studio actions accessible via the bottom control dock</span>
        </motion.div>

        <div className="dash-workflows-grid">
          <motion.div
            className="dash-workflow-card featured"
            onClick={() => onSwitchTab('optimizer')}
            {...scrollBlurCard}
            transition={{ ...scrollBlurCard.transition, delay: 0.04 }}
          >
            <div className="dash-wf-top">
              <div className="dash-wf-icon-wrap primary">
                <LightningIcon width={24} height={24} />
              </div>
              <span className="dash-wf-tag">PRIMARY WORKFLOW</span>
            </div>
            <h3 className="dash-wf-title">Lossless Video Optimizer</h3>
            <p className="dash-wf-desc">
              Re-structure video containers so mobile feeds acknowledge native 60fps fluidity and full HDR peak nits. Never re-compresses or softens video packets.
            </p>
            <div className="dash-wf-footer">
              <span className="dash-wf-cta">Launch Optimizer</span>
              <span className="dash-wf-arrow">→</span>
            </div>
          </motion.div>

          <motion.div
            className="dash-workflow-card"
            onClick={() => onSwitchTab('inspect')}
            {...scrollBlurCard}
            transition={{ ...scrollBlurCard.transition, delay: 0.08 }}
          >
            <div className="dash-wf-top">
              <div className="dash-wf-icon-wrap">
                <InspectIcon width={24} height={24} />
              </div>
              <span className="dash-wf-tag">DIAGNOSTICS</span>
            </div>
            <h3 className="dash-wf-title">Container Codec Inspector</h3>
            <p className="dash-wf-desc">
              Audit box atoms, timescale clocks, real framerates, and color matrices. Probes local master video files or live published TikTok video links.
            </p>
            <div className="dash-wf-footer">
              <span className="dash-wf-cta">Audit Video</span>
              <span className="dash-wf-arrow">→</span>
            </div>
          </motion.div>

          <motion.div
            className="dash-workflow-card"
            onClick={() => onSwitchTab('guide')}
            {...scrollBlurCard}
            transition={{ ...scrollBlurCard.transition, delay: 0.12 }}
          >
            <div className="dash-wf-top">
              <div className="dash-wf-icon-wrap">
                <BookOpenIcon width={24} height={24} />
              </div>
              <span className="dash-wf-tag">EXPORT PROTOCOLS</span>
            </div>
            <h3 className="dash-wf-title">Studio Master Guide</h3>
            <p className="dash-wf-desc">
              Step-by-step master export specifications for DaVinci Resolve Studio, Adobe Premiere Pro, and Apple iPhone HDR footage for pristine playback.
            </p>
            <div className="dash-wf-footer">
              <span className="dash-wf-cta">Read Protocols</span>
              <span className="dash-wf-arrow">→</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ---------- Studio Quality Pillars (No Leaked Engineering Formulas) ---------- */}
      <div className="dash-pillars-section">
        <motion.div className="dash-section-header" {...scrollBlurCard}>
          <h2 className="dash-section-title">Master Quality Commitments</h2>
          <span className="dash-section-sub">Engineered for creators who refuse generational compression loss</span>
        </motion.div>

        <div className="dash-pillars-grid">
          <motion.div className="dash-pillar-item" {...scrollBlurCard} transition={{ ...scrollBlurCard.transition, delay: 0.04 }}>
            <div className="dash-pillar-top">
              <div className="dash-pillar-check">
                <CheckIcon width={16} height={16} strokeWidth={2.5} />
              </div>
              <h4 className="dash-pillar-name">100% Bit-for-Bit Stream Copy</h4>
            </div>
            <p className="dash-pillar-desc">
              Obito Studio never decompresses or re-encodes frames. Compressed video and audio packets pass through completely intact, ensuring 0% loss of master sharpness.
            </p>
          </motion.div>

          <motion.div className="dash-pillar-item" {...scrollBlurCard} transition={{ ...scrollBlurCard.transition, delay: 0.08 }}>
            <div className="dash-pillar-top">
              <div className="dash-pillar-check">
                <CheckIcon width={16} height={16} strokeWidth={2.5} />
              </div>
              <h4 className="dash-pillar-name">Full High-FPS Fluidity Lock</h4>
            </div>
            <p className="dash-pillar-desc">
              Container metadata is structured to satisfy platform ingestion rules, eliminating the automatic 30fps downsampling pass applied to standard uploads.
            </p>
          </motion.div>

          <motion.div className="dash-pillar-item" {...scrollBlurCard} transition={{ ...scrollBlurCard.transition, delay: 0.12 }}>
            <div className="dash-pillar-top">
              <div className="dash-pillar-check">
                <CheckIcon width={16} height={16} strokeWidth={2.5} />
              </div>
              <h4 className="dash-pillar-name">Sovereign On-Device Security</h4>
            </div>
            <p className="dash-pillar-desc">
              Your masters never touch public cloud repositories. Operations run locally on NVMe storage, and files are automatically purged immediately after download.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
