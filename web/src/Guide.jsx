import { motion } from 'framer-motion';
import { FilmIcon, HdrIcon, FpsIcon, CheckIcon, AlertTriangleIcon, UploadIcon, ShareIcon } from './icons.jsx';

const scrollBlurCard = {
  initial: { opacity: 0.2, filter: 'blur(10px)', y: 24 },
  whileInView: { opacity: 1, filter: 'blur(0px)', y: 0 },
  viewport: { once: false, amount: 0.15, margin: "-10px 0px -40px 0px" },
  transition: { duration: 0.52, ease: [0.16, 1, 0.3, 1] }
};

export default function Guide({ onSwitchToOptimizer }) {
  const steps = [
    {
      num: '01',
      badge: 'Video Editor Settings',
      title: 'Export at Your Preferred Resolution & Bitrate',
      tagline: 'DaVinci Resolve · CapCut · Premiere Pro · After Effects',
      desc: 'Export at your choice of resolution (1080p, 2K, or 4K 9:16 portrait).',
      rules: [
        { label: 'Recommended Bitrate', val: '~30 Mbps (30,000 kbps) for clean master detail. Higher or lower bitrates are also 100% accepted.' },
        { label: 'Frame Rate', val: 'Export at your preferred frame rate. Obito Studio keeps that source frame rate in the remuxed output; TikTok may change it after upload.' },
        { label: 'Color & HDR', val: 'Turn on HDR (HLG / Rec.2020) in your editor if you desire punchy dynamic range in the TikTok feed.' }
      ]
    },
    {
      num: '02',
      badge: 'Crucial Mobile Rule',
      title: 'Save & Upload From "Files App" (Not Photos/Gallery)',
      tagline: 'Avoid iOS / Android Mobile Downsampling',
      desc: 'When transferring or picking your video on mobile, ALWAYS choose from your Files App (or save to Files first) instead of the Photos/Gallery picker.',
      rules: [
        { label: 'Why Files App?', val: 'Mobile photo galleries silently downsample high-bitrate video, strip HDR down to SDR, and drop frame rates before web upload.' },
        { label: 'The Rule', val: 'Selecting via "Choose File → Browse / Files" preserves 100% of your master bitrate, frame count, and color gamut.' }
      ],
      highlight: true
    },
    {
      num: '03',
      badge: 'Obito Studio Remux',
      title: 'Optimize Container Atoms With Zero Generational Loss',
      tagline: '100% Stream Copy (-c:v copy)',
      desc: 'Choose HDR or Standard mode, then let the stream-remux engine package the output without re-encoding video frames.',
      rules: [
        { label: 'Presets', val: 'Select the HDR option for HDR/HLG footage or Standard for SDR. Both keep the source frame rate in the output.' },
        { label: 'Under the Hood', val: 'Video is stream-copied, the output keeps one primary audio track, and the container is arranged for fast start.' }
      ]
    },
    {
      num: '04',
      badge: 'Final Publishing',
      title: 'Upload via TikTok Desktop/Web for Maximum Bitrate',
      tagline: 'tiktok.com/upload · Direct Public Post',
      desc: 'Once your optimized video is ready, open your mobile or desktop browser and navigate to the TikTok Desktop/Web upload page (tiktok.com/upload).',
      rules: [
        { label: 'Direct Public Post', val: 'Publish directly as Public. Avoid saving as a "Private Draft" first, which triggers TikTok\'s aggressive secondary re-compression pass.' },
        { label: 'Desktop Web Uploader', val: 'The web uploader respects high-framerate container atoms and bypasses mobile app client-side compression rungs.' }
      ]
    }
  ];

  return (
    <div className="guide-view">
      <motion.div
        className="guide-hero"
        initial={{ opacity: 0.3, filter: 'blur(12px)', y: 16 }}
        animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="guide-title">
          How to Upload Lossless Videos to TikTok
        </h1>
        <p className="guide-subtitle">
          Follow this proven step-by-step master workflow to stop TikTok compression, preserve 60fps/120fps fluidity, and deliver ultra-sharp playback.
        </p>
      </motion.div>

      <div className="guide-steps-list">
        {steps.map((s, idx) => (
          <motion.div
            key={s.num}
            className={`guide-step-card ${s.highlight ? 'is-highlight' : ''}`}
            {...scrollBlurCard}
            transition={{ ...scrollBlurCard.transition, delay: idx * 0.05 }}
          >
            <div className="guide-step-top">
              <div className="guide-step-num-badge">{s.num}</div>
              <div className="guide-step-header-text">
                <span className="guide-step-category">{s.badge}</span>
                <h2 className="guide-step-title">{s.title}</h2>
                {s.tagline && <span className="guide-step-tagline">{s.tagline}</span>}
              </div>
            </div>

            <div className="guide-step-divider" />

            <div className="guide-step-body">
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
          </motion.div>
        ))}
      </div>

      <motion.div
        className="guide-cta-card"
        {...scrollBlurCard}
      >
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
          <span>Open Optimizer →</span>
        </button>
      </motion.div>
    </div>
  );
}

