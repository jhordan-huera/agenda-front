/**
 * El lector de QR de «Escanear» (spec 052). Primero, el `BarcodeDetector` del navegador (Chrome y Android); si no lo
 * tiene o no lee QR (Safari, Firefox), el paquete `barcode-detector`, que se descarga sólo aquí, al abrir la cámara,
 * con su WebAssembly servido desde la propia app (no desde un CDN).
 */

export interface QrDetector {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}

interface NativeBarcodeDetector {
  new (options?: { formats?: string[] }): QrDetector;
  getSupportedFormats?: () => Promise<string[]>;
}

async function nativeDetector(): Promise<QrDetector | null> {
  const Native = (globalThis as { BarcodeDetector?: NativeBarcodeDetector }).BarcodeDetector;
  if (!Native) return null;
  try {
    const formats = (await Native.getSupportedFormats?.()) ?? [];
    return formats.includes("qr_code") ? new Native({ formats: ["qr_code"] }) : null;
  } catch {
    return null;
  }
}

let fallback: Promise<QrDetector> | null = null;

function packageDetector(): Promise<QrDetector> {
  fallback ??= Promise.all([import("barcode-detector/ponyfill"), import("zxing-wasm/reader/zxing_reader.wasm?url")])
    .then(async ([{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }]) => {
      // Se carga ya (no en la primera lectura): si el navegador no puede, «Escanear» lo dice en vez de quedarse mirando.
      await prepareZXingModule({
        overrides: { locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? wasmUrl : prefix + path) },
        fireImmediately: true,
      });
      return new BarcodeDetector({ formats: ["qr_code"] });
    })
    .catch((error: unknown) => {
      // Si falló la descarga, el próximo intento vuelve a probar.
      fallback = null;
      throw error;
    });
  return fallback;
}

export async function createQrDetector(): Promise<QrDetector> {
  return (await nativeDetector()) ?? (await packageDetector());
}
