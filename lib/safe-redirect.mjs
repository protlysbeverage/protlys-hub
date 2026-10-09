const SAFE_ORIGIN = 'https://hub.protlys.com';

/**
 * Accept only same-origin internal redirect destinations.
 * Use a fixed origin so Host headers and preview hostnames cannot affect validation.
 */
export function getSafeNext(value) {
  if (typeof value !== 'string' || !value.startsWith('/')) return '/';

  try {
    const target = new URL(value, SAFE_ORIGIN);
    if (target.origin !== SAFE_ORIGIN) return '/';
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return '/';
  }
}
