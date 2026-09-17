/**
 * Buffer polyfill for React Native + Jest.
 * Provides globalThis.Buffer without requiring callers to use `require('buffer')` directly.
 * Uses Uint8Array fallback when `buffer` package is unavailable (e.g. in minimal Jest env).
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
let BufferImpl: any = null;
try {
  // Allow bundlers to handle this; eslint override permits require in this polyfill
  BufferImpl = require('buffer').Buffer;
} catch {
  BufferImpl = null;
}

if (typeof globalThis !== 'undefined' && !(globalThis as any).Buffer) {
  if (BufferImpl) {
    (globalThis as any).Buffer = BufferImpl;
  } else {
    // Minimal Uint8Array-based shim sufficient for XLSX which checks Buffer presence
    (globalThis as any).Buffer = {
      from: (arr: Uint8Array | number[] | string) => {
        if (typeof arr === 'string') return new TextEncoder().encode(arr);
        return Uint8Array.from(arr as any);
      },
      alloc: (size: number, fill = 0) => new Uint8Array(size).fill(fill),
      isBuffer: () => false,
    };
  }
}

if (typeof global !== 'undefined' && (global as any) !== globalThis && !(global as any).Buffer) {
  (global as any).Buffer = (globalThis as any).Buffer;
}

export const Buffer = (globalThis as any).Buffer;
export default Buffer;
