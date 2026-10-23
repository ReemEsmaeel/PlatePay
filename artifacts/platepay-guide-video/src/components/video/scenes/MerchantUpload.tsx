import { motion } from 'framer-motion';
import { Check, ScanLine } from 'lucide-react';

const ease = [0.22, 1, 0.36, 1] as const;

export function MerchantUpload() {
  return (
    <motion.section className="scene" style={{ background: '#f4f3ed' }} initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.09, filter: 'blur(3px)' }} transition={{ duration: .36, ease }}>
      <div style={{ position: 'absolute', inset: '0 0 0 0', background: 'linear-gradient(120deg,#f4f3ed 0%,#f4f3ed 29%,#dce8e0 29%,#dce8e0 100%)' }}/>
      <div style={{ position: 'absolute', left: '6%', top: '8%', zIndex: 5 }}>
        <div className="scene-kicker" style={{ color: '#0c8767' }}>01 / MERCHANT</div>
        <motion.h1 initial={{ opacity: 0, y: 20, clipPath: 'inset(0 0 100% 0)' }} animate={{ opacity: 1, y: 0, clipPath: 'inset(0 0 0 0)' }} transition={{ duration: .58, delay: .15, ease }} style={{ font: '700 8vmin/.92 var(--font-display)', letterSpacing: '-.075em', margin: '1.6vmin 0', color: '#102b3a' }}>
          THE MERCHANT<br/><span style={{ color: '#0b8a68' }}>STARTS.</span>
        </motion.h1>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .62 }} className="ui-card" style={{ width: '33vmin', padding: '2.1vmin', marginTop: '2.6vmin' }}>
          <div className="ui-label">New payment request</div>
          <div style={{ font: '600 2.4vmin var(--font-display)', margin: '1.25vmin 0 1.8vmin' }}>Upload a vehicle photo</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1vmin', color: '#71827f', fontSize: '1.35vmin' }}><span style={{ width: '3.2vmin', height: '3.2vmin', display: 'grid', placeItems: 'center', borderRadius: '.7vmin', background: '#e5f4ec', color: '#078968' }}><ScanLine size={18}/></span>Local plate review</div>
          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: .6, delay: 2.25 }} className="mint-rule" style={{ marginTop: '2.1vmin' }}/>
        </motion.div>
      </div>
      <motion.div initial={{ clipPath: 'inset(0 100% 0 0)', rotate: 1.2 }} animate={{ clipPath: 'inset(0 0% 0 0)', rotate: 0 }} transition={{ duration: .72, ease, delay: .12 }} style={{ position: 'absolute', top: '14%', right: '5.5%', width: '58%', height: '72%', overflow: 'hidden', borderRadius: '1.5vmin', boxShadow: '0 2.2vmin 7vmin rgba(13,49,48,.2)' }}>
        <img src={`${import.meta.env.BASE_URL}images/merchant-car.jpg`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 56%', display: 'block', transform: 'scale(1.03)' }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(8,31,35,.18),transparent 50%),linear-gradient(0deg,rgba(8,31,35,.56),transparent 39%)' }}/>
        <div className="scene-kicker" style={{ position: 'absolute', left: '3%', top: '4%', color: '#fff', padding: '.9vmin 1.2vmin', borderRadius: '.5vmin', background: 'rgba(7,34,39,.72)' }}>CAR PHOTO · LOCAL REVIEW</div>
        <motion.div initial={{ opacity: 0, scale: .82 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.1, duration: .4 }} style={{ position: 'absolute', left: '40.5%', top: '62%', width: '17.5%', height: '10%', border: '.28vmin solid #61e0b7', borderRadius: '.55vmin', boxShadow: '0 0 0 100vmax rgba(6,27,32,.16)' }}>
          <motion.div initial={{ y: 0 }} animate={{ y: ['0%', '600%', '0%'] }} transition={{ duration: 1.15, delay: 1.15, ease: 'linear' }} style={{ height: '2px', background: '#8bffd7', boxShadow: '0 0 1.5vmin #6cf1c4' }}/>
          <span style={{ position: 'absolute', right: '-.25vmin', top: '-2.3vmin', padding: '.45vmin .7vmin', borderRadius: '.3vmin', background: '#19a47c', color: 'white', font: '500 1.1vmin var(--font-mono)' }}>PLATE FOUND</span>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16, scale: .92 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 1.75, duration: .52, ease }} style={{ position: 'absolute', right: '4%', bottom: '5%', display: 'flex', alignItems: 'center', gap: '1.4vmin', background: '#fffefa', borderRadius: '.9vmin', padding: '1vmin 1.5vmin', boxShadow: '0 1vmin 3vmin rgba(0,0,0,.16)' }}>
          <span style={{ width: '3vmin', height: '3vmin', display: 'grid', placeItems: 'center', borderRadius: '50%', background: '#e1f4eb', color: '#078968' }}><Check size={16}/></span>
          <span className="mono" style={{ fontSize: '2.5vmin', fontWeight: 500, color: '#102b3a' }}>7 · 8942</span>
        </motion.div>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.72 }} style={{ position: 'absolute', left: '6%', bottom: '9.4%', color: '#526d70', fontSize: '1.85vmin' }}>
        Review the plate before sending. <span className="mono" style={{ color: '#0b8a68', marginLeft: '1.3vmin' }}>KWD 2.500 · DRIVE-THRU</span>
      </motion.div>
      <motion.div initial={{ scale: .65, opacity: 0 }} animate={{ scale: [ .65, 1, 3.2 ], opacity: [0, 1, 0] }} transition={{ duration: .65, delay: 4.76, times: [0,.25,1], ease }} style={{ position: 'absolute', zIndex: 20, right: '22%', top: '57%', width: '13vmin', height: '5.2vmin', border: '.4vmin solid #83e5c4', borderRadius: '.8vmin', pointerEvents: 'none' }}/>
    </motion.section>
  );
}
