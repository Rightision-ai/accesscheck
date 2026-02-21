declare module "heic-convert/browser" {
  interface ConvertOptions {
    buffer: ArrayBuffer | Uint8Array;
    format: "JPEG" | "PNG";
    quality?: number;
  }

  function convert(options: ConvertOptions): Promise<ArrayBuffer>;

  export default convert;
}
