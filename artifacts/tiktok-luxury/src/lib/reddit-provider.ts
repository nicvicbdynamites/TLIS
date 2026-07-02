/**
 * Reddit Provider — provider-agnostic client for TLIS pages.
 *
 * Matches the exact pattern of trends-provider.ts so future providers
 * can swap in without page changes.
 *
 * Usage:
 *   import { redditService } from "@/lib/reddit-provider";
 *   const data = await redditService.getLuxurySummary();
 *
 * React hook usage:
 *   import { useRedditSummary } from "@/lib/reddit-provider";
 *   const { data, loading, error } = useRedditSummary();
 */

import { useEffect, useState } from "react";

// ── Result Types (mirror server types) ────────────────────────────────────

export interface RedditPost {
  title:       string;
  subreddit:   string;
  score:       number;
  numComments: number;
  upvoteRatio: number;
  permalink:   string;
  created:     number;
  selftext:    string;
}

export interface RedditSentiment {
  positive: number;
  negative: number;
  neutral:  number;
  overall:  "positive" | "negative" | "neutral";
  label:    string;
}

export interface RedditSubreddit {
  name:        string;
  title:       string;
  subscribers: number;
  description: string;
}

export interface RedditSummary {
  topDiscussions:         RedditPost[];
  emergingConversations:  RedditPost[];
  frequentTopics:         string[];
  faqs:                   string[];
  opinions:               string[];
  painPoints:             string[];
  sentiment:              RedditSentiment;
  communityInterestScore: number;
  discussionVolume:       number;
  fastestGrowingTopic:    string;
  fetchedAt:              string;
  source:                 "live" | "cached" | "fallback";
}

// ── HTTP Helper ────────────────────────────────────────────────────────────

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`/api${path}`, window.location.origin);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res  = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  const data = await res.json().catch(() => ({ error: "Failed to parse response" }));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

// ── Reddit Service ─────────────────────────────────────────────────────────

export const redditService = {
  getLuxurySummary: () =>
    get<RedditSummary>("/reddit/luxury-summary"),

  searchPosts: (q: string) =>
    get<{ query: string; posts: RedditPost[] }>("/reddit/search-posts", { q }),

  searchSubreddits: (q: string) =>
    get<{ query: string; subreddits: RedditSubreddit[] }>("/reddit/search-subreddits", { q }),

  getTrendingDiscussions: () =>
    get<{ posts: RedditPost[] }>("/reddit/trending-discussions"),

  getTopPosts: (subreddit: string) =>
    get<{ subreddit: string; posts: RedditPost[] }>("/reddit/top-posts", { subreddit }),

  getHotPosts: (subreddit: string) =>
    get<{ subreddit: string; posts: RedditPost[] }>("/reddit/hot-posts", { subreddit }),

  getNewPosts: (subreddit: string) =>
    get<{ subreddit: string; posts: RedditPost[] }>("/reddit/new-posts", { subreddit }),

  getSentimentSummary: () =>
    get<RedditSentiment>("/reddit/sentiment-summary"),
};

// ── React Hook ─────────────────────────────────────────────────────────────

export interface UseRedditSummaryResult {
  data:    RedditSummary | null;
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

export function useRedditSummary(): UseRedditSummaryResult {
  const [data,    setData]    = useState<RedditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tick,    setTick]    = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    redditService.getLuxurySummary()
      .then(d  => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(String(e?.message ?? "Failed to load Reddit data")); setLoading(false); } });

    return () => { cancelled = true; };
  }, [tick]);

  return { data, loading, error, refetch: () => setTick(t => t + 1) };
}
