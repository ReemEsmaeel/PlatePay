import { useEffect, useRef } from 'react';
import { PLATE_REGIONS, regionRectangle } from '../lib/kuwait-plate';
import { preparePlateImage } from '../lib/plate-image';

export function PlatePhotoPreview({ file, zoom }: { file: File; zoom: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    // Same crop as recognition, not a visually zoomed image with different bounds.
    void preparePlateImage(file, zoom).then(image => {
      if (cancelled || !ref.current) return;
      const canvas = ref.current;
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(image, 0, 0);
      ctx.strokeStyle = '#078968';
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 8]);
      for (const name of Object.keys(PLATE_REGIONS) as (keyof typeof PLATE_REGIONS)[]) {
        const r = regionRectangle(name, canvas.width, canvas.height);
        ctx.strokeRect(r.left, r.top, r.width, r.height);
      }
    }).catch(() => {
      if (!cancelled && ref.current) {
        const canvas = ref.current;
        canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      }
    });
    return () => { cancelled = true; };
  }, [file, zoom]);
  return <canvas ref={ref} role="img" aria-label="Exact Kuwait plate crop. Align the series and registration number inside the two outlined areas." style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }}/>;
}
