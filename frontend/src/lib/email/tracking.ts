const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://scrapman-nine.vercel.app";

export function injectTrackingPixel(
  html: string,
  messageId: string,
  teamId: string
): string {
  const url = `${APP_URL}/api/track/open?mid=${encodeURIComponent(messageId)}&tid=${encodeURIComponent(teamId)}`;
  const pixel = `<img src="${url}" width="1" height="1" style="display:none;border:0;outline:0;opacity:0;" alt="" />`;
  return html.includes("</body>") ? html.replace("</body>", `${pixel}</body>`) : html + pixel;
}
