import { motion } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as const;

export function PlateHook() {
  return (
    <motion.section
      className="scene"
      style={{ background: '#092832', color: '#f2f4ec' }}
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.12, filter: 'blur(4px)' }}
      transition={{ duration: .38, ease }}
    >
      <div style={{ position: 'absolute', inset: '0', background: 'radial-gradient(ellipse at 72% 48%, rgba(32,122,99,.24), transparent 42%)' }} />
      <div style={{ position: 'absolute', inset: '7% 6%', borderTop: '1px solid rgba(219,243,232,.15)', borderBottom: '1px solid rgba(219,243,232,.11)' }} />
      <div className="scene-kicker" style={{ position: 'absolute', left: '6.2%', top: '8.5%', color: '#9ab8b4' }}>
        <span style={{ color: '#6cdbb5' }}>PLATEPAY</span><span style={{ margin: '0 1.2vmin', opacity: .42 }}>/</span>KUWAIT
      </div>
      <motion.div
        initial={{ x: 40, rotate: 2.2, scale: .84 }}
        animate={{ x: 0, rotate: -.8, scale: 1 }}
        transition={{ duration: .9, ease, delay: .12 }}
        style={{ position: 'absolute', width: '54%', height: '37%', right: '-1%', top: '29%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3.7vmin 4.5vmin', transformOrigin: 'center' }}
        className="plate-slab"
      >
        <div className="plate-country">KUWAIT<br/>الكويت</div>
        <div className="plate-number">7 <span style={{ color: '#1a9b78' }}>·</span> 8942</div>
        <div style={{ position: 'absolute', inset: '1.25vmin', border: '1px solid rgba(17,42,52,.17)', borderRadius: '.75vmin' }} />
      </motion.div>
      <motion.div
        initial={{ scale: 1, opacity: 0 }}
        animate={{ scale: [1, 1.12, 3.8], opacity: [0, .9, 0] }}
        transition={{ delay: 3.62, duration: .88, times: [0, .28, 1], ease }}
        style={{ position: 'absolute', width: '54%', height: '37%', right: '-1%', top: '29%', border: '.42vmin solid #7de5c1', borderRadius: '1.35vmin', pointerEvents: 'none' }}
      />
      <div style={{ position: 'absolute', left: '6.3%', top: '23%', width: '43%', zIndex: 2 }}>
        <motion.div
          initial={{ opacity: 0, scale: .78, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 18, delay: .18 }}
          style={{ font: '700 21vmin/.82 var(--font-display)', letterSpacing: '-.09em', color: '#f3f3e9' }}
        >ONE</motion.div>
        <motion.div
          initial={{ opacity: 0, scale: .82, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 20, delay: .62 }}
          style={{ marginTop: '1.6vmin', font: '700 14.5vmin/.88 var(--font-display)', letterSpacing: '-.08em', color: '#72ddba' }}
        >PLATE.</motion.div>
        <motion.p className="scene-copy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55, delay: 1.25 }} style={{ margin: '3.1vmin 0 0', color: '#c1d2cb', maxWidth: '34vmin' }}>
          Two people. One clear decision.
        </motion.p>
      </div>
      <div style={{ position: 'absolute', left: '7%', right: '7%', bottom: '12.5%', height: '10%', display: 'flex', alignItems: 'center', color: '#b6cbc4', font: '500 1.5vmin var(--font-mono)', letterSpacing: '.11em' }}>
        <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 2.18 }} style={{ display: 'flex', alignItems: 'center', gap: '1vmin' }}><i style={{ display: 'inline-block', width: '.85vmin', height: '.85vmin', borderRadius: '50%', background: '#1cb188' }}/> MERCHANT</motion.span>
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: .7, delay: 2.35, ease }} style={{ height: '1px', width: '20%', background: 'linear-gradient(90deg,#15a47c,#72ddba)', margin: '0 1.8vmin', transformOrigin: 'left' }}/>
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.9 }}>DRIVER</motion.span>
      </div>
      <div className="scene-kicker" style={{ position: 'absolute', right: '6.2%', bottom: '8.5%', color: '#769793' }}>A REQUEST, NEVER AN AUTO-CHARGE</div>
    </motion.section>
  );
}
