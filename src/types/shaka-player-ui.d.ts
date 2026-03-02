/**
 * Type declaration for the Shaka Player UI build.
 * The main package entry (shaka-player.compiled.js) doesn't include the UI;
 * we need shaka-player.ui.js which exports named CJS exports.
 */
declare module 'shaka-player/dist/shaka-player.ui.js' {
  interface ShakaPlayer {
    attach(mediaElement: HTMLMediaElement): Promise<void>;
    load(assetUri: string, startTime?: number | null): Promise<void>;
    destroy(): Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }

  interface ShakaUIOverlay {
    configure(config: Record<string, unknown>): void;
    destroy(forceDisconnect?: boolean): Promise<void>;
  }

  export const Player: {
    new (
      mediaElement?: HTMLMediaElement | null,
      videoContainer?: HTMLElement | null,
    ): ShakaPlayer;
    isBrowserSupported(): boolean;
  };

  export const polyfill: {
    installAll(): void;
  };

  export const ui: {
    Overlay: {
      new (
        player: ShakaPlayer,
        videoContainer: HTMLElement,
        video: HTMLMediaElement,
      ): ShakaUIOverlay;
    };
  };
}
