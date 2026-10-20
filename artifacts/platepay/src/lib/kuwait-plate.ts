// Supported layout: a small series above a larger registration number,
// with country labels at the left and upper right. Other layouts need manual entry.
export const PLATE_ASPECT = 1.85;
export const PLATE_REGIONS = {
  series: { x: 0.132, y: 0.045, width: 0.248, height: 0.325 },
  number: { x: 0.132, y: 0.452, width: 0.837, height: 0.494 },
} as const;

export function plateCrop(width: number, height: number, zoom: number, centerX = 0.5, centerY = 0.5) {
  if (!(width > 0 && height > 0 && Number.isFinite(zoom) && Number.isFinite(centerX) && Number.isFinite(centerY))) {
    throw new Error('Invalid image dimensions');
  }
  const ratio = width / height;
  // Keep an already tightly framed landscape plate intact. Forcing its aspect
  // ratio or clipping a few pixels can change stencil digits during recognition.
  const aspect = ratio >= 1.5 && ratio <= 2.3 ? ratio : PLATE_ASPECT;
  const cropWidth = Math.min(width, height * aspect) / Math.max(1, zoom);
  const cropHeight = cropWidth / aspect;
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  return {
    x: (width - cropWidth) * clamp(centerX),
    y: (height - cropHeight) * clamp(centerY),
    width: cropWidth, height: cropHeight,
  };
}

export function regionRectangle(name: keyof typeof PLATE_REGIONS, width: number, height: number) {
  const r = PLATE_REGIONS[name];
  return {
    left: Math.round(r.x * width),
    top: Math.round(r.y * height),
    width: Math.round(r.width * width),
    height: Math.round(r.height * height),
  };
}

type Reading = { text: string; confidence: number };
export function stripPlateWhitespace(value: string) {
  return value.replace(/\s/g, '');
}

export function interpretKuwaitPlate(series: Reading, number: Reading) {
  const digits = (text: string) => text
    .replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 0x6f0))
    .trim();
  const code = digits(series.text);
  const registration = digits(number.text);
  const confidence = Math.min(series.confidence, number.confidence);
  // Never delete stray letters, invent missing digits, or fill only half a plate.
  // Confidence is a review gate, not a guarantee that the number is correct.
  if (!/^\d{1,2}$/.test(code) || !/^\d{1,6}$/.test(registration)
    || !Number.isFinite(confidence) || confidence < 80) {
    return { plate: null, confidence };
  }
  return { plate: `${code}${registration}`, confidence };
}
