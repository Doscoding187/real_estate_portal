// Shutdown must clean up a lazily loaded service without importing it and
// creating a fresh singleton (and interval) during the drain itself.
let loadedService: { destroy(): void } | null = null;

export function registerGooglePlacesServiceForShutdown(service: { destroy(): void }): void {
  loadedService = service;
}

export function stopGooglePlacesService(): void {
  loadedService?.destroy();
  loadedService = null;
}
