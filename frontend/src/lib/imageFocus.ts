export function imageObjectPosition(url: string | null | undefined) {
  if (!url) {
    return undefined;
  }

  if (url.includes("noah-reed-story-2.png")) {
    return "center 22%";
  }

  return undefined;
}
