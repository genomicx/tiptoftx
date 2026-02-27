import '@testing-library/jest-dom/vitest'

// Polyfill Blob.prototype.stream for jsdom (which lacks this Web Streams method).
// jsdom's Blob has slice/size/type but not arrayBuffer() or stream(), so we use
// FileReader (which jsdom does implement) to read bytes.
if (typeof Blob !== 'undefined' && !('stream' in Blob.prototype)) {
  Object.defineProperty(Blob.prototype, 'stream', {
    writable: true,
    value(this: Blob): ReadableStream<Uint8Array> {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const blob = this
      return new ReadableStream<Uint8Array>({
        start(controller) {
          const reader = new FileReader()
          reader.onload = () => {
            const result = reader.result
            if (result instanceof ArrayBuffer) {
              controller.enqueue(new Uint8Array(result))
            }
            controller.close()
          }
          reader.onerror = () => controller.error(reader.error)
          reader.readAsArrayBuffer(blob)
        },
      })
    },
  })
}
