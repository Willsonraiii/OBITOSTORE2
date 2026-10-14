import { useEffect, useState } from 'react';
import {
  LightningIcon, InspectIcon, BookOpenIcon,
  DashboardIcon, LayersIcon, FpsIcon, HdrIcon, ShieldIcon
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
      {/* ---------- Dashboard Section Header ---------- */}
      <div className="section-head">
        <div className="head-badge">
          <DashboardIcon width={14} height={14} />
          <span>STUDIO CONTROL DASHBOARD</span>
        </div>
        <h2 className="head-title">Engine Telemetry &amp; System Monitor</h2>
        <p className="head-sub">
          Lossless container stream-copy pipeline, timescale synchronization engine, and master ingestion specs.
        </p>
      </div>

      {/* ---------- Telemetry Stats Row ---------- */}
      <div className="dash-telemetry-grid">
        <div className="dash-stat-card">
          <div className="dash-stat-header">
            <span className="dash-stat-label">REMUX PIPELINE</span>
            <span className={`dash-pulse-dot ${queueStatus.busy ? 'busy' : 'active'}`} />
          </div>
          <div className="dash-stat-val">
            {loading ? 'SYNCING…' : queueStatus.busy ? 'OPTIMIZING' : 'STANDBY · READY'}
          </div>
          <div className="dash-stat-desc">
            {queueStatus.busy && queueStatus.activeJob?.stage
              ? `Active stage: ${queueStatus.activeJob.stage}`
              : 'Pure lossless stream copy (-c copy)'}
          </div>
        </div>

        <div className="dash-stat-card">
          <div className="dash-stat-header">
            <span className="dash-stat-label">TIMESCALE CLOCK</span>
            <span className="dash-pulse-dot active" />
          </div>
          <div className="dash-stat-val">19,200 Hz</div>
          <div className="dash-stat-desc">Target 60.00 &amp; 120.00 FPS TikTok sync</div>
        </div>

        <div className="dash-stat-card">
          <div className="dash-stat-header">
            <span className="dash-stat-label">COLOR PIPELINE</span>
            <span className="dash-pulse-dot active" />
          </div>
          <div className="dash-stat-val">DOVI PROFILE 8.4</div>
          <div className="dash-stat-desc">Dynamic RPU → Native Rec.2020 HLG demux</div>
        </div>

        <div className="dash-stat-card">
          <div className="dash-stat-header">
            <span className="dash-stat-label">ENGINE QUEUE</span>
            <span className={`dash-pulse-dot ${queueStatus.queuedCount > 0 ? 'busy' : 'active'}`} />
          </div>
          <div className="dash-stat-val">
            {loading ? '—' : queueStatus.queuedCount > 0 ? `${queueStatus.queuedCount} IN QUEUE` : '0 QUEUED'}
          </div>
          <div className="dash-stat-desc">
            {queueStatus.queuedCount > 0
              ? 'Sequential NVMe execution in line'
              : 'Zero wait · Stream-to-disk architecture'}
          </div>
        </div>
      </div>

      {/* ---------- Quick Launch Workflow Cards ---------- */}
      <div className="dash-workflows-section">
        <h3 className="dash-section-title">Mastering Workflows</h3>
        <div className="dash-workflows-grid">
          <div className="dash-workflow-card">
            <div className="dash-wf-top">
              <div className="dash-wf-icon-wrap">
                <LightningIcon width={22} height={22} />
              </div>
              <span className="dash-wf-tag">CORE PIPELINE</span>
            </div>
            <h4 className="dash-wf-title">Lossless TikTok Optimizer</h4>
            <p className="dash-wf-desc">
              Harmonize timescale containers to 19200 and demux Apple Dolby Vision dynamic metadata.
              Preserves 100% of bit-for-bit master quality with zero generation transcoding loss.
            </p>
            <div className="dash-wf-action">
              <button
                type="button"
                className="btn-dash-action primary"
                onClick={() => onSwitchTab('optimizer')}
              >
                <span>Launch Optimizer</span>
                <span className="dash-btn-arrow">→</span>
              </button>
            </div>
          </div>

          <div className="dash-workflow-card">
            <div className="dash-wf-top">
              <div className="dash-wf-icon-wrap">
                <InspectIcon width={22} height={22} />
              </div>
              <span className="dash-wf-tag">CONTAINER AUDIT</span>
            </div>
            <h4 className="dash-wf-title">TikTok Codec Inspector</h4>
            <p className="dash-wf-desc">
              Inspect video box atoms, container timescales, color primaries, and real FPS. Probe either local
              master video files or live published TikTok video URLs before distributing.
            </p>
            <div className="dash-wf-action">
              <button
                type="button"
                className="btn-dash-action"
                onClick={() => onSwitchTab('inspect')}
              >
                <span>Inspect Video</span>
                <span className="dash-btn-arrow">→</span>
              </button>
            </div>
          </div>

          <div className="dash-workflow-card">
            <div className="dash-wf-top">
              <div className="dash-wf-icon-wrap">
                <BookOpenIcon width={22} height={22} />
              </div>
              <span className="dash-wf-tag">EXPORT PRESETS</span>
            </div>
            <h4 className="dash-wf-title">Studio Master Guide</h4>
            <p className="dash-wf-desc">
              Step-by-step master export settings for Apple iPhone HDR, DaVinci Resolve Studio, and Adobe
              Premiere Pro engineered to bypass TikTok&apos;s automatic 30fps downgrade pass.
            </p>
            <div className="dash-wf-action">
              <button
                type="button"
                className="btn-dash-action"
                onClick={() => onSwitchTab('guide')}
              >
                <span>Read Master Guide</span>
                <span className="dash-btn-arrow">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- TikTok Ingestion Master Spec Matrix ---------- */}
      <div className="dash-matrix-section">
        <div className="dash-matrix-header">
          <h3 className="dash-section-title">TikTok Ingestion Spec Matrix</h3>
          <span className="dash-matrix-sub">Verified standards required by TikTok&apos;s mobile transcode gate</span>
        </div>

        <div className="dash-matrix-table-wrap">
          <table className="dash-matrix-table">
            <thead>
              <tr>
                <th>CONTAINER PARAMETER</th>
                <th>OBITO MASTER SPEC</th>
                <th>TIKTOK INGESTION RULE</th>
                <th>INGESTION BEHAVIOR</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong className="param-name">Video Timescale</strong></td>
                <td><code className="spec-val">19200 / 15360</code></td>
                <td>Exact integer frame multiple</td>
                <td><span className="spec-status ok">Full 60fps &amp; 120fps fluid playback</span></td>
              </tr>
              <tr>
                <td><strong className="param-name">Video Compression</strong></td>
                <td><code className="spec-val">-c copy (Stream Copy)</code></td>
                <td>Master packet preservation</td>
                <td><span className="spec-status ok">Zero generational sharpness loss</span></td>
              </tr>
              <tr>
                <td><strong className="param-name">Apple Dolby Vision</strong></td>
                <td><code className="spec-val">Profile 8.4 → HLG 2020</code></td>
                <td>Strip unhandled dynamic RPU</td>
                <td><span className="spec-status ok">Peak brightness preserved; no SDR blowout</span></td>
              </tr>
              <tr>
                <td><strong className="param-name">Audio Clock</strong></td>
                <td><code className="spec-val">19,200 container ticks</code></td>
                <td>Video clock synchronization</td>
                <td><span className="spec-status ok">Eliminates audio drift &amp; end-frame cutoffs</span></td>
              </tr>
              <tr>
                <td><strong className="param-name">Atom Structure</strong></td>
                <td><code className="spec-val">Faststart moov atom</code></td>
                <td>Container header at file start</td>
                <td><span className="spec-status ok">Instant mobile streaming buffer</span></td>
              </tr>
              <tr>
                <td><strong className="param-name">Resolution Limit</strong></td>
                <td><code className="spec-val">1080×1920 / 2160×3840</code></td>
                <td>Portrait 9:16 vertical standard</td>
                <td><span className="spec-status ok">Native fullscreen viewport fill</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
