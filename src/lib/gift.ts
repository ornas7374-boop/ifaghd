import path from "node:path";

/**
 * Two supported modes for the gift itself:
 *  - Local protected file (default): put your file at private-gift/gift.html
 *    (or point GIFT_FILE_PATH at it). It's streamed through a signed,
 *    short-lived URL — never linked to directly.
 *  - External link: set GIFT_EXTERNAL_URL if the "gift" is actually a link
 *    you host elsewhere (e.g. a Google Drive file or another map). The
 *    gift page will show a button to it instead of embedding a local file.
 */
export function getGiftConfig() {
  const externalUrl = process.env.GIFT_EXTERNAL_URL?.trim();
  if (externalUrl) {
    return { mode: "external" as const, url: externalUrl };
  }

  const filePath = path.resolve(
    /* turbopackIgnore: true */ process.env.GIFT_FILE_PATH || "./private-gift/gift.html"
  );
  const fileName = process.env.GIFT_FILE_NAME || "خريطة-كلود.html";
  return { mode: "file" as const, filePath, fileName };
}

export function guessContentType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case ".html":
    case ".htm":
      return "text/html; charset=utf-8";
    case ".pdf":
      return "application/pdf";
    case ".zip":
      return "application/zip";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}
