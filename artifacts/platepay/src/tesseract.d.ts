declare module 'tesseract.js' {
  export function createWorker(languages?: string): Promise<{
    recognize(image: HTMLCanvasElement | Blob | string): Promise<{ data: { text: string } }>;
    terminate(): Promise<void>;
  }>;
}
