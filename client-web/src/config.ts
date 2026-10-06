/**
 * Build-time configuration, the equivalent of the Flash build's CONFIG::SERVER_URL
 * and CONFIG::CDN_URL defines. Set SERVER_URL / CDN_URL when building.
 */
declare const __SERVER_URL__: string;
declare const __CDN_URL__: string;

export const CONFIG = {
  SERVER_URL: __SERVER_URL__,
  CDN_URL: __CDN_URL__,
};
