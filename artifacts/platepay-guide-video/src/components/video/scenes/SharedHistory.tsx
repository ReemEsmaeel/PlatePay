import { motion } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as const;

function HistoryPanel({ title, own, delay, wide = false }: { title: string; own: boolean; delay: number; wide?: boolean }) {
  return <motion.div initial={{ opacity: 0, x: own ? -20 : 20, rotateY: own ? 8 : -8, scale: .9 }} animate={{ opacity: [0, 1, 1, 0], x: [own ? -20 : 20, 0, 0, own ? -18 : 18], rotateY: [own ? 8 : -8, 0, 0, own ? -5 : 5], scale: [.9, 1, 1, .93] }} transition={{ duration: 4.35, delay, times: [0, .16, .82, 1], ease }} style={{ position: 'absolute', left: own ? '7%' : '55%', top: own ? '23%' : '33%', width: wide ? '43%' : '39%', minHeight: '36%', padding: '2.3vmin 2.5vmin', border: '1px solid rgba(221,241,230,.2)', borderRadius: '1.2vmin', background: 'rgba(240,246,236,.07)', boxShadow: '0 2vmin 5vmin rgba(0,0,0,.14)', transformPerspective: 1000 }}>
    <div className="scene-kicker" style={{ color: '#9abbb0' }}>{title}</div>
    <div style={{ marginTop: '2vmin', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#eef4ec' }}>
      <span style={{ font: '600 2.05vmin var(--font-display)', letterSpacing: '-.04em' }}>Seaside Drive‑Thru</span>
      <span className="tiny-chip" style={{ fontSize: '1vmin' }}>APPROVED</span>
    </div>
    <div className="mono" style={{ marginTop: '1vmin', color: '#9bb5ad', fontSize: '1.55vmin' }}>PLATE · 7 · 8942</div>
    <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: delay + .45, duration: .65, ease }} className="mint-rule" style={{ marginTop: '1.8vmin' }}/>
    <div style={{ marginTop: '1.2vmin', display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
      <span style={{ color: '#89a8a0', fontSize: '1.25vmin' }}>Drive-thru payment</span>
      <b className="mono" style={{ color: '#a8efce', fontSize: '2.45vmin', fontWeight: 500 }}>KWD 2.500</b>
    </div>
  </motion.div>;
}

export function SharedHistory() {
  return (
    <motion.section className="scene" style={{ background: '#092832', color: '#f4f4eb' }} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.07 }} transition={{ duration: .35, ease }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 45%,rgba(31,117,91,.2),transparent 52%)' }}/>
      <div className="scene-kicker" style={{ position: 'absolute', left: '6.2%', top: '8%', color: '#8ab2a6' }}>04 / PAYMENT RECORD</div>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: [0, 1, 1, 0], y: [14, 0, 0, -8] }} transition={{ delay: .2, duration: 4.1, times: [0, .16, .84, 1], ease }} style={{ position: 'absolute', left: '6.2%', top: '11%', font: '700 5.9vmin/.95 var(--font-display)', letterSpacing: '-.075em', color: '#f1f2e9' }}>
        ONE PAYMENT.<br/><span style={{ color: '#75dfba' }}>TWO HISTORIES.</span>
      </motion.div>
      <HistoryPanel title="DRIVER HISTORY" own delay={.42} wide/>
      <HistoryPanel title="MERCHANT HISTORY" own={false} delay={.68}/>
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.7, duration: .6, ease }} style={{ position: 'absolute', left: '47%', top: '52%', height: '1px', width: '13%', background: '#83e5c4', transformOrigin: 'left' }}/>
      <motion.div initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: [0, 1, 1], opacity: [0, .9, .9] }} transition={{ delay: 3.55, duration: .62, times: [0, .55, 1], ease }} style={{ position: 'absolute', left: '50%', top: '24%', height: '51%', width: '.28vmin', zIndex: 2, background: '#0b8a68', transformOrigin: 'top' }}/>
      <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: [0, 1, 1, 0], y: [12, 0, 0, -8] }} transition={{ delay: 2.1, duration: 2.3, times: [0, .2, .7, 1], ease }} style={{ position: 'absolute', left: '6.3%', bottom: '13.4%', margin: 0, color: '#aec5bb', fontSize: '2.3vmin' }}>The same payment. Visible to both.</motion.p>
      <motion.div initial={{ opacity: 0, scaleX: .03 }} animate={{ opacity: [0, 1, 1], scaleX: [ .03, 1, 1 ] }} transition={{ delay: 4.78, duration: .53, ease }} style={{ position: 'absolute', inset: 0, zIndex: 3, background: '#f4f3ed', transformOrigin: 'center' }}/>
      <motion.div initial={{ opacity: 0, color: '#f4f3ed' }} animate={{ opacity: [0, 1, 1], color: ['#f4f3ed', '#092832', '#092832'] }} transition={{ delay: 4.22, duration: 1.1, times: [0,.7,1], ease }} style={{ position: 'absolute', left: '50%', top: '48%', transform: 'translate(-50%,-50%)', textAlign: 'center', zIndex: 5, pointerEvents: 'none' }}>
        <div className="brand-word">Plate<span style={{ color: '#0b8a68' }}>Pay</span></div>
        <div className="scene-kicker" style={{ marginTop: '1.1vmin', fontSize: '1.1vmin' }}>YOUR PLATE. YOUR CALL.</div>
      </motion.div>
      <motion.div initial={{ scale: .08, opacity: 0 }} animate={{ scale: [ .08, 1.04, 1 ], opacity: [0, 1, 1] }} transition={{ delay: 6.85, duration: 1.08, times: [0, .92, 1], ease }} style={{ position: 'absolute', width: '54%', height: '37%', right: '-1%', top: '29%', border: '.42vmin solid #0b8a68', borderRadius: '1.35vmin', zIndex: 8, pointerEvents: 'none' }}/>
    </motion.section>
  );
}
