/** Gallery media is stored as URLs; video files are recognised by extension. */
export const isVideoUrl = (url: string) => /\.(mp4|webm|mov)(\?|#|$)/i.test(url);
