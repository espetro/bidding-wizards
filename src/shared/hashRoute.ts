/**
 * HashRouter only sees `#/bid`. Vercel (and a Pages 404) can land on `/bid`.
 * Promote the path so the estimator opens instead of a blank 404 / home bounce.
 */
export function hashUrlForPath(pathname: string, search = "", hash = ""): string | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path.endsWith("/bid") && !hash.startsWith("#/")) {
    const root = path.replace(/\/bid$/, "/");
    return `${root}#/bid${search}`;
  }
  return null;
}
