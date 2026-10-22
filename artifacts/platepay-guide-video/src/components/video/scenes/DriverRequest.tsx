import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';

const ease = [0.22, 1, 0.36, 1] as const;

export function DriverRequest() {
  return (
    <motion.section className="scene" style={{ background: '#e8f0e9' }} initial={{ opacity: 0, scale: 1.025 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.08, filter: 'blur(4px)' }} transition={{ duration: .34, ease }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 68% 55%, #d0e3d7 0, transparent 48%)' }}/>
      <div style={{ position: 'absolute', top: '9%', left: '6.3%', color: '#0b8a68' }} className="scene-kicker">02 / DRIVER REVIEW</div>
      <svg viewBox="0 0 1000 600" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: .62, pointerEvents: 'none' }} aria-hidden="true">
        <motion.path d="M65 470 C210 480 245 390 300 354 S384 294 440 320 L580 320" fill="none" stroke="#6ca78f" strokeWidth="2" strokeDasharray="7 9" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: [.0, .8, .55] }} transition={{ delay: 1.7, duration: 1.1, ease }}/>
        <motion.circle cx="65" cy="470" r="8" fill="#118967" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.72, type: 'spring', stiffness: 260 }}/>
      </svg>
      <motion.div initial={{ opacity: 0, x: -24, clipPath: 'inset(0 100% 0 0)' }} animate={{ opacity: 1, x: 0, clipPath: 'inset(0 0 0 0)' }} transition={{ delay: .16, duration: .58, ease }} style={{ position: 'absolute', left: '6%', top: '28%', width: '37%', zIndex: 3 }}>
        <div style={{ font: '700 16vmin/.88 var(--font-display)', letterSpacing: '-.09em', color: '#102b3a' }}>YOUR<br/><span style={{ color: '#0b8a68' }}>CALL.</span></div>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.85 }} className="scene-copy" style={{ color: '#5c7474', maxWidth: '31vmin', marginTop: '2.5vmin' }}>Review the merchant, plate and amount.</motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.1 }} style={{ color: '#536e6e', fontSize: '1.7vmin', marginTop: '2vmin', maxWidth: '33vmin' }}>Recognition never approves a payment.</motion.div>
      </motion.div>
      <motion.div initial={{ scale: .73, opacity: 0, rotateY: 12 }} animate={{ scale: [ .73, 1.035, 1 ], opacity: 1, rotateY: 0 }} transition={{ delay: .08, duration: .92, ease }} className="ui-card" style={{ position: 'absolute', right: '9.2%', top: '13%', width: '42%', height: '73%', padding: '3.3vmin 3.4vmin', transformPerspective: 1000 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="ui-label">REQUEST FOR APPROVAL</span><span className="tiny-chip">PENDING</span>
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .65 }} style={{ marginTop: '3.5vmin', font: '700 4.3vmin var(--font-display)', letterSpacing: '-.055em', color: '#102b3a' }}>Seaside Drive‑Thru</motion.div>
        <div className="ui-row" style={{ marginTop: '2.5vmin', color: '#667b7a' }}><span>Vehicle plate</span><b className="mono" style={{ color: '#102b3a', fontSize: '2.2vmin' }}>7 · 8942</b></div>
        <div className="ui-row" style={{ color: '#667b7a' }}><span>Service</span><b style={{ color: '#102b3a' }}>Drive-thru</b></div>
        <motion.div initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.3, duration: .42 }} style={{ marginTop: '2.4vmin', padding: '2.3vmin 2.5vmin', borderRadius: '1vmin', background: '#f2f6f1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div className="ui-label">TOTAL TO REVIEW</div><div className="mono" style={{ fontSize: '5.4vmin', fontWeight: 500, color: '#0c765a', marginTop: '.7vmin' }}>2.500 <small style={{ fontSize: '1.8vmin' }}>KWD</small></div></div>
          <div style={{ width: '5.1vmin', height: '5.1vmin', display: 'grid', placeItems: 'center', borderRadius: '50%', color: '#0b8a68', background: '#d8eee1' }}><MapPin size={22}/></div>
        </motion.div>
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 2.4, duration: .65, ease }} className="mint-rule" style={{ marginTop: '2.3vmin' }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.2vmin', fontSize: '1.35vmin', color: '#83918e' }}><span>Merchant</span><span>Plate</span><span>Amount</span></div>
      </motion.div>
      <motion.div initial={{ scale: .1, opacity: 0 }} animate={{ scale: [ .1, 1.5, 2.5 ], opacity: [0, .8, 0] }} transition={{ delay: 4.3, duration: .65, times: [0,.45,1], ease }} style={{ position: 'absolute', width: '13vmin', height: '13vmin', border: '.34vmin solid #16a77e', borderRadius: '50%', right: '29%', top: '57%', zIndex: 5, pointerEvents: 'none' }}/>
    </motion.section>
  );
}
