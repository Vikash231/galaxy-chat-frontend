const SPOKEN = { img: "the image", vid: "the video", aud: "the audio" } as const;

/**
 * Hide internal file names (img_1, vid_2) and invented media tags in reply text; the files render on their own.
 * Mirrors the backend's hideFileNames so old messages and live streams read the same as new saved replies.
 */
export function hideFileNames(text: string): string {
  return text
    .replace(/<(video|audio|img)\b[^>]*>[\s\S]*?<\/\1>|<(video|audio|img)\b[^>]*\/?>/gi, "")
    .replace(/!?\[[^\]]*\]\(\s*(?:img|vid|aud)_[a-z0-9]+\s*\)/g, "")
    .replace(/\s*\((?:img|vid|aud)_[a-z0-9]+\)/g, "")
    .replace(/[`"']?(?<![\w/.-])(img|vid|aud)_[a-z0-9]+(?![\w-]|\.\w)[`"']?/g, (_m, kind: keyof typeof SPOKEN) => SPOKEN[kind])
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
