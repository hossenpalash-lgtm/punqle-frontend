// Downloads a saved video from storage so it can be posted.
//
// Why pieces: on some laptops Chrome drops one big download of the file (about 19 MB for an 8 s video) near the end, while the
// same file downloads fine in small pieces. So the file is fetched 2 MB at a time. If the server ignores ranges and sends the
// whole file, that is used as it is. Storage doesn't expose the total size to the page, so the end is the first short piece
// (or a 416 reply when the file ends exactly on a piece boundary).

export const VIDEO_PIECE_BYTES = 2 * 1024 * 1024;
const TRIES_PER_PIECE = 3;

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

async function fetchPiece(url: string, start: number, pieceBytes: number, doFetch: FetchLike): Promise<Response | Blob> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= TRIES_PER_PIECE; attempt++) {
    try {
      const res = await doFetch(url, { headers: { Range: `bytes=${start}-${start + pieceBytes - 1}` } });
      if (res.status === 416 || res.status === 200) return res;
      if (res.status !== 206) throw new Error(`Unexpected status ${res.status}`);
      const piece = await res.blob();
      if (piece.size === 0) throw new Error("Empty piece");
      return piece;
    } catch (e) {
      lastError = e;
      if (attempt < TRIES_PER_PIECE) await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Couldn't download the video.");
}

export async function downloadVideoBlob(
  url: string,
  options: { pieceBytes?: number; fetchFn?: FetchLike } = {},
): Promise<Blob> {
  const pieceBytes = options.pieceBytes ?? VIDEO_PIECE_BYTES;
  const doFetch: FetchLike = options.fetchFn ?? ((u, init) => fetch(u, init));
  const parts: Blob[] = [];
  let start = 0;
  for (;;) {
    const got = await fetchPiece(url, start, pieceBytes, doFetch);
    if (got instanceof Blob) {
      parts.push(got);
      start += got.size;
      if (got.size < pieceBytes) break; // the last, shorter piece
      continue;
    }
    if (got.status === 416) {
      if (parts.length === 0) throw new Error("The video is empty.");
      break; // the file ended exactly on a piece boundary
    }
    // 200: the server ignored the range and sent the whole file
    if (start !== 0) throw new Error("The server stopped honouring ranges.");
    return await got.blob();
  }
  return new Blob(parts, { type: parts[0].type || "video/mp4" });
}
