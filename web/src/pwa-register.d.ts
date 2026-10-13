declare module "virtual:pwa-register" {
  export function registerSW(options?: {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegisteredSW?: (swScriptUrl: string) => void;
    onRegisterError?: (error: Error) => void;
  }): (reloadPage?: boolean) => Promise<void>;
}
