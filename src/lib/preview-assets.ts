// The little style pictures and clips under /public are served with a one-day browser cache (plus a week of
// "show the old one while checking"), so a picture replaced under the SAME file name keeps showing the old one to
// people who looked recently. Adding ?v=<this> to the address makes every browser fetch the new file at once.
// Change PREVIEW_VERSION whenever a preview picture or clip under /public is replaced.
export const PREVIEW_VERSION = "20261112";

export function previewAsset(path: string): string {
  return `${path}?v=${PREVIEW_VERSION}`;
}
