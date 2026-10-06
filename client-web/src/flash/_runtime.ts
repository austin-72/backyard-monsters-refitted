/**
 * Services every flash.* package may need from the player, without importing it.
 * The Player replaces these at startup.
 */
export const runtimeHooks = {
  /** Reports an exception that escaped AS3 code (becomes UncaughtErrorEvent). */
  uncaught: (e: unknown): void => { console.error(e); },
  /** Runs player-initiated AS3 code (timer, network, input callbacks) with error reporting. */
  guard(fn: () => void): void {
    try { fn(); } catch (e) { runtimeHooks.uncaught(e); }
  },
  /** Queues work for the next frame (asynchronous Flash events are delivered between frames). */
  defer: (fn: () => void): void => { setTimeout(fn, 0); },
  /** true while dispatching a user-initiated input event (fullscreen, navigateToURL, clipboard) */
  inUserGesture: false,
  /** The native text input lost focus on its own (e.g. iOS keyboard "Done"): the player drops the game's focus. */
  inputBlurred: (): void => {},
  /** The game asked for full screen but this browser has no element full-screen API (iPhone Safari). */
  fullScreenUnavailable: (): void => {},
};
