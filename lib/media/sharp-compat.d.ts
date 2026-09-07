declare module 'sharp' {
  export type SharpMetadata = {
    format?: string;
    width?: number;
    height?: number;
    pages?: number;
    exif?: Buffer;
    iptc?: Buffer;
    xmp?: Buffer;
    icc?: Buffer;
    hasAlpha?: boolean;
  };

  export type SharpOutputInfo = {
    width: number;
    height: number;
  };

  export type SharpOverlayOptions = {
    input: SharpInput;
    left: number;
    top: number;
  };

  export type SharpInstance = {
    metadata(): Promise<SharpMetadata>;
    rotate(): SharpInstance;
    resize(options: {
      width?: number;
      height?: number;
      fit?: 'inside' | 'cover' | 'contain' | 'fill';
      position?: 'centre' | 'center';
      withoutEnlargement?: boolean;
    }): SharpInstance;
    resize(
      width: number,
      height: number,
      options?: {
        fit?: 'inside' | 'cover' | 'contain' | 'fill';
        position?: 'centre' | 'center';
      },
    ): SharpInstance;
    extract(options: {
      left: number;
      top: number;
      width: number;
      height: number;
    }): SharpInstance;
    composite(overlays: SharpOverlayOptions[]): SharpInstance;
    ensureAlpha(): SharpInstance;
    raw(): SharpInstance;
    toColourspace(colourspace: 'srgb'): SharpInstance;
    webp(options: {
      quality: number;
      effort?: number;
      smartSubsample?: boolean;
    }): SharpInstance;
    jpeg(options?: { quality?: number }): SharpInstance;
    png(): SharpInstance;
    withMetadata(options: {
      exif?: Record<string, Record<string, string>>;
    }): SharpInstance;
    toBuffer(): Promise<Buffer>;
    toBuffer(options: {
      resolveWithObject: true;
    }): Promise<{ data: Buffer; info: SharpOutputInfo }>;
    toFile(path: string): Promise<SharpOutputInfo>;
  };

  export type SharpInput =
    | string
    | Uint8Array
    | {
        create: {
          width: number;
          height: number;
          channels: 3 | 4;
          background: string;
        };
      };

  export type SharpOptions = {
    failOn?: 'none' | 'truncated' | 'error' | 'warning';
    limitInputPixels?: number;
    sequentialRead?: boolean;
  };

  export default function sharp(
    input: SharpInput,
    options?: SharpOptions,
  ): SharpInstance;
}
