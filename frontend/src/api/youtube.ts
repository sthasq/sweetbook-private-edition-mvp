import { get, post } from "./client";
import type {
  YouTubeAuthUrl,
  YouTubeAvailability,
  YouTubeConnection,
  YouTubeChannel,
  YouTubeChannelDetail,
  YouTubeVideo,
  YouTubeAnalyzeResult,
} from "../types/api";

export function getAvailability() {
  return get<YouTubeAvailability>("/youtube/availability", { ttlMs: 60_000 });
}

export function getAuthUrl() {
  return get<YouTubeAuthUrl>("/youtube/auth-url");
}

export function handleCallback(code: string, state: string) {
  return post<YouTubeConnection>("/youtube/callback", { code, state });
}

export function getSubscriptions() {
  return get<YouTubeChannel[]>("/youtube/subscriptions", { ttlMs: 30_000 });
}

export function getChannelDetail(channelId: string) {
  return get<YouTubeChannelDetail>(`/youtube/channels/${channelId}`, {
    ttlMs: 60_000,
  });
}

export function getTopVideos(channelId: string, limit = 5) {
  return get<YouTubeVideo[]>(
    `/youtube/channels/${channelId}/top-videos?limit=${limit}`,
    { ttlMs: 60_000 },
  );
}

export function analyzeChannel(body: {
  channelId: string;
  fanNickname?: string;
  favoriteVideoId?: string;
  fanNote?: string;
}) {
  return post<YouTubeAnalyzeResult>("/youtube/analyze", body);
}
