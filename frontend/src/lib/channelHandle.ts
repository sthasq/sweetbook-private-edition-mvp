export function formatChannelHandle(handle?: string | null) {
  if (!handle) {
    return "";
  }

  return handle.startsWith("@") ? handle : `@${handle}`;
}
