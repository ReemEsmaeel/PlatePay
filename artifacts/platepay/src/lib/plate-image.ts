import { plateCrop } from './kuwait-plate';

export async function preparePlateImage(file: File, zoom: number) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Image unavailable'));
      image.src = url;
    });
    const crop = plateCrop(image.naturalWidth, image.naturalHeight, zoom);
    const canvas = document.createElement('canvas');
    // Integer upscaling keeps small stencil digits intact; bound large photos.
    const scale = crop.width < 1280 ? Math.min(4, Math.ceil(1280 / crop.width)) : 1280 / crop.width;
    canvas.width = Math.round(crop.width * scale);
    canvas.height = Math.round(canvas.width * crop.height / crop.width);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}
