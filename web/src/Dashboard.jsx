import { useEffect, useState } from 'react';
import {
  LightningIcon, InspectIcon, BookOpenIcon,
  DashboardIcon, ShieldIcon, CheckIcon
} from './icons.jsx';

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
      <div className="dash-hero-card">
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
          <button
            type="button"
            className="btn-dash-hero primary"
            onClick={() => onSwitchTab('optimizer')}
          >
            <LightningIcon width={18} height={18} />
            <span>Open Lossless Optimizer</span>
            <span className="dash-arrow">→</span>
          </button>
          <button
            type="button"
            className="btn-dash-hero secondary"
            onClick={() => onSwitchTab('inspect')}
          >
            <InspectIcon width={18} height={18} />
            <span>Audit Video Container</span>
          </button>
        </div>
      </div>

      {/* ---------- Live Hardware Telemetry Matrix ---------- */}
      <div className="dash-telemetry-grid">
        <div className="dash-stat-card">
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
        </div>

        <div className="dash-stat-card">
          <div className="dash-stat-header">
            <span className="dash-stat-label">MOTION PRESERVATION</span>
          </div>
          <div className="dash-stat-val">60 &amp; 120 FPS</div>
          <div className="dash-stat-desc">Locks native frame rates; defeats platform 30fps drop</div>
        </div>

        <div className="dash-stat-header-card dash-stat-card">
          <div className="dash-stat-header">
            <span className="dash-stat-label">COLOR FIDELITY</span>
          </div>
          <div className="dash-stat-val">10-BIT HDR &amp; DOVI</div>
          <div className="dash-stat-desc">Native Wide Color Gamut &amp; peak dynamic range intact</div>
        </div>

        <div className="dash-stat-card">
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
        </div>
      </div>

      {/* ---------- Mastering Workflows ---------- */}
      <div className="dash-workflows-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Mastering Workflows</h2>
          <span className="dash-section-sub">Direct studio actions accessible via the bottom control dock</span>
        </div>

        <div className="dash-workflows-grid">
          <div className="dash-workflow-card featured" onClick={() => onSwitchTab('optimizer')}>
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
          </div>

          <div className="dash-workflow-card" onClick={() => onSwitchTab('inspect')}>
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
          </div>

          <div className="dash-workflow-card" onClick={() => onSwitchTab('guide')}>
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
          </div>
        </div>
      </div>

      {/* ---------- Studio Quality Pillars (No Leaked Engineering Formulas) ---------- */}
      <div className="dash-pillars-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Master Quality Commitments</h2>
          <span className="dash-section-sub">Engineered for creators who refuse generational compression loss</span>
        </div>

        <div className="dash-pillars-grid">
          <div className="dash-pillar-item">
            <div className="dash-pillar-top">
              <div className="dash-pillar-check">
                <CheckIcon width={16} height={16} strokeWidth={2.5} />
              </div>
              <h4 className="dash-pillar-name">100% Bit-for-Bit Stream Copy</h4>
            </div>
            <p className="dash-pillar-desc">
              Obito Studio never decompresses or re-encodes frames. Compressed video and audio packets pass through completely intact, ensuring 0% loss of master sharpness.
            </p>
          </div>

          <div className="dash-pillar-item">
            <div className="dash-pillar-top">
              <div className="dash-pillar-check">
                <CheckIcon width={16} height={16} strokeWidth={2.5} />
              </div>
              <h4 className="dash-pillar-name">Full High-FPS Fluidity Lock</h4>
            </div>
            <p className="dash-pillar-desc">
              Container metadata is structured to satisfy platform ingestion rules, eliminating the automatic 30fps downsampling pass applied to standard uploads.
            </p>
          </div>

          <div className="dash-pillar-item">
            <div className="dash-pillar-top">
              <div className="dash-pillar-check">
                <CheckIcon width={16} height={16} strokeWidth={2.5} />
              </div>
              <h4 className="dash-pillar-name">Sovereign On-Device Security</h4>
            </div>
            <p className="dash-pillar-desc">
              Your masters never touch public cloud repositories. Operations run locally on NVMe storage, and files are automatically purged immediately after download.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
