import { createWorker, PSM } from 'tesseract.js';
import { interpretKuwaitPlate, regionRectangle } from './kuwait-plate';
import { preparePlateImage } from './plate-image';

export async function readKuwaitPlate(file: File, zoom: number) {
  const canvas = await preparePlateImage(file, zoom);
  // One language model instead of mixed Arabic/English country-label recognition.
  const worker = await createWorker('eng');
  try {
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789',
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
    });
    const series = await worker.recognize(canvas, {
      rectangle: regionRectangle('series', canvas.width, canvas.height),
    });
    const number = await worker.recognize(canvas, {
      rectangle: regionRectangle('number', canvas.width, canvas.height),
    });
    return interpretKuwaitPlate(series.data, number.data);
  } finally {
    await worker.terminate();
  }
}
