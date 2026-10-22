import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const ease = [0.22, 1, 0.36, 1] as const;

export function DriverApproval() {
  return (
    <motion.section className="scene" style={{ background: '#082a31', color: '#f3f4eb' }} initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1, filter: 'blur(3px)' }} transition={{ duration: .34, ease }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 56%,rgba(15,99,77,.36),transparent 42%)' }}/>
      <div className="scene-kicker" style={{ position: 'absolute', left: '6.2%', top: '8.6%', color: '#8ab2a6' }}>03 / DRIVER APPROVAL</div>
      <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .2 }} style={{ position: 'absolute', top: '19%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', width: '56%' }}>
        <div className="ui-label" style={{ color: '#9bb9b0' }}>YOU ARE ABOUT TO APPROVE</div>
        <div className="mono" style={{ fontSize: '5.8vmin', lineHeight: 1.1, color: '#f5f3e8', marginTop: '1vmin' }}>KWD 2.500</div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .55, duration: .38 }} style={{ position: 'absolute', top: '29.5%', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '1.7vmin', color: '#a8c4bb', fontSize: '1.45vmin', whiteSpace: 'nowrap' }}>
        <span>Approve this request?</span>
        <span style={{ border: '1px solid rgba(141,229,194,.6)', borderRadius: '.55vmin', padding: '.75vmin 1.5vmin', color: '#a5efcf', fontWeight: 700 }}>Approve payment</span>
      </motion.div>
      <motion.div initial={{ scale: .42, opacity: 0 }} animate={{ scale: [ .42, 1.08, 1 ], opacity: 1 }} transition={{ delay: .12, duration: .86, ease }} style={{ position: 'absolute', width: '28vmin', height: '28vmin', border: '.4vmin solid rgba(121,232,190,.92)', borderRadius: '50%', left: '50%', top: '36%', transform: 'translateX(-50%)', display: 'grid', placeItems: 'center', boxShadow: '0 0 0 1.5vmin rgba(19,156,115,.09),0 0 9vmin rgba(20,177,132,.18)' }}>
        <motion.div initial={{ opacity: 0, scale: .65 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.46, type: 'spring', stiffness: 260, damping: 18 }} style={{ width: '18vmin', height: '18vmin', display: 'grid', placeItems: 'center', borderRadius: '50%', background: '#7ce2bd', color: '#06392e' }}><Check size={96} strokeWidth={2.3}/></motion.div>
      </motion.div>
      <motion.div initial={{ opacity: 0, scale: .82 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.72, duration: .4, ease }} style={{ position: 'absolute', left: 0, right: 0, top: '68%', textAlign: 'center', font: '700 5.5vmin/.9 var(--font-display)', letterSpacing: '.08em', color: '#8de5c2' }}>APPROVED</motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.32, duration: .42 }} style={{ position: 'absolute', left: '22%', right: '22%', bottom: '10%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(220,244,232,.17)', paddingTop: '1.7vmin', color: '#a8c4bb' }}>
        <span style={{ fontSize: '1.55vmin' }}>WALLET BALANCE</span>
        <span className="mono" style={{ fontSize: '2.8vmin' }}><span style={{ opacity: .48, textDecoration: 'line-through', marginRight: '1.2vmin' }}>20.000</span><b style={{ color: '#f1f6ef', fontWeight: 500 }}>17.500 KWD</b></span>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.18 }} style={{ position: 'absolute', left: '0', right: '0', bottom: '4.5%', textAlign: 'center', color: '#86a59e', fontSize: '1.5vmin' }}>No money moved before driver approval.</motion.div>
      <motion.div initial={{ scale: .2, opacity: 0 }} animate={{ scale: [ .2, 1.1, 2.8 ], opacity: [0, 1, 0] }} transition={{ delay: 4.53, duration: .46, times: [0,.26,1], ease }} style={{ position: 'absolute', left: 'calc(50% - 9vmin)', top: 'calc(50% - 9vmin)', width: '18vmin', height: '18vmin', border: '.38vmin solid #8de5c2', borderRadius: '50%', pointerEvents: 'none' }}/>
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 4.72, duration: .28, ease }} style={{ position: 'absolute', insetInlineStart: '50%', top: '50%', width: '50%', height: '.34vmin', transformOrigin: 'left', background: '#8de5c2' }}/>
    </motion.section>
  );
}
