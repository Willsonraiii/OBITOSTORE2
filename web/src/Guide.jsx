import { SparkIcon, FilmIcon, HdrIcon, FpsIcon, CheckIcon, AlertTriangleIcon, UploadIcon, ShareIcon } from './icons.jsx';

export default function Guide({ onSwitchToOptimizer }) {
  const steps = [
    {
      num: '01',
      badge: 'Video Editor Settings',
      title: 'Export at Your Preferred Resolution & Bitrate',
      desc: 'Export from CapCut, Premiere Pro, DaVinci Resolve, or After Effects at any resolution of your choice (1080p, 2K, 4K portrait 9:16).',
      rules: [
        { label: 'Recommended Bitrate', val: '~30 Mbps (30,000 kbps) for peak clarity. Higher or lower bitrates are also 100% accepted without errors.' },
        { label: 'Frame Rate', val: '60 fps or 120 fps native fluidity. Obito Studio harmonizes non-standard timescales to 19200 multiples.' },
        { label: 'Color & HDR', val: 'Turn on HDR (HLG / Rec.2020) in your editor if you want punchy, wide dynamic range in the TikTok feed.' }
      ]
    },
    {
      num: '02',
      badge: 'Crucial Mobile Step',
      title: 'Save & Upload From "Files App" (Not Photos/Gallery)',
      desc: 'When transferring or picking your video on mobile, ALWAYS choose from your Files App (or save to Files first) instead of the Photos/Gallery picker.',
      rules: [
        { label: 'Why Files App?', val: 'iOS Photos and mobile galleries automatically downsample high-bitrate files, compress HDR to SDR, and throttle frame rates before passing them to web browsers.' },
        { label: 'The Rule', val: 'Picking directly via "Choose File → Browse / Files" preserves 100% of your master bitrate, frame count, and color gamut.' }
      ],
      highlight: true
    },
    {
      num: '03',
      badge: 'Obito Studio Remux',
      title: 'Optimize Container Atoms With Zero Loss',
      desc: 'Choose your preferred mode on Obito Studio and let the stream-remux engine package the container.',
      rules: [
        { label: 'Presets', val: 'Select "FPS + Quality + HDR" for iPhone HDR/HLG or "FPS + Quality" for standard SDR.' },
        { label: 'Under the Hood', val: 'Zero pixel re-encoding (-c:v copy). Strips udta camera tracking fingerprints, applies 19200 timescale matching, and injects broadcast timecode (tmcd + tref).' }
      ]
    },
    {
      num: '04',
      badge: 'Final Publishing',
      title: 'Upload via TikTok Desktop/Web for Maximum Bitrate',
      desc: 'Once your optimized video is ready, open your mobile or desktop browser and navigate to the TikTok Desktop/Web upload page (tiktok.com/upload).',
      rules: [
        { label: 'Direct Public Post', val: 'Publish directly as Public. Avoid saving as a "Private Draft" first, which triggers TikTok\'s aggressive secondary re-compression pass.' },
        { label: 'Desktop Web Uploader', val: 'The web uploader respects the 19200 timescale and bypasses mobile app client-side compression rungs.' }
      ]
    }
  ];

  return (
    <div className="guide-view">
      <div className="guide-hero">
        <div className="guide-badge-pill">
          <SparkIcon width={14} height={14} />
          <span>Creator Masterclass</span>
        </div>
        <h1 className="guide-title">How to Upload Lossless Videos to TikTok</h1>
        <p className="guide-subtitle">
          Follow this proven step-by-step master workflow to stop TikTok compression, preserve 60fps/120fps fluidity, and deliver ultra-sharp 4K HDR playback.
        </p>
      </div>

      <div className="guide-steps-list">
        {steps.map((s) => (
          <div key={s.num} className={`guide-step-card ${s.highlight ? 'is-highlight' : ''}`}>
            <div className="guide-step-header">
              <span className="guide-step-number">{s.num}</span>
              <div className="guide-step-meta">
                <span className="guide-step-badge">{s.badge}</span>
                <h2 className="guide-step-title">{s.title}</h2>
              </div>
            </div>

            <p className="guide-step-desc">{s.desc}</p>

            <div className="guide-step-rules">
              {s.rules.map((r, i) => (
                <div key={i} className="guide-rule-item">
                  <div className="guide-rule-dot">
                    <CheckIcon width={12} height={12} />
                  </div>
                  <div className="guide-rule-content">
                    <b className="guide-rule-label">{r.label}:</b>
                    <span className="guide-rule-val">{r.val}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="guide-cta-card">
        <div className="guide-cta-icon">
          <UploadIcon width={24} height={24} />
        </div>
        <div className="guide-cta-content">
          <h3 className="guide-cta-title">Ready to optimize your next upload?</h3>
          <p className="guide-cta-desc">Export your master video, select it from your Files App, and run Obito Studio.</p>
        </div>
        <button
          type="button"
          className="btn-primary-hero guide-cta-btn"
          onClick={onSwitchToOptimizer}
        >
          <span>Open Optimizer</span>
        </button>
      </div>
    </div>
  );
}
