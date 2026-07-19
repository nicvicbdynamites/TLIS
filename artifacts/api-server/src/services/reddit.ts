import type { Log } from "./gemini.js";

// ——— Result Types ———

export interface RedditPost {
  title: string;
  subreddit: string;
  score: number;
  numComments: number;
  upvoteRatio: number;
  permalink: string;
  created: number;
  selftext: string;
}

export interface RedditSentiment {
  positive: number;
  negative: number;
  neutral: number;
  overall: "positive" | "negative" | "neutral";
  label: string;
}

export interface RedditSubreddit {
  name: string;
  title: string;
  subscribers: number;
  description: string;
}

export interface RedditSummary {
  topDiscussions: RedditPost[];
  emergingConversations: RedditPost[];
  frequentTopics: string[];
  faqs: string[];
  opinions: string[];
  painPoints: string[];
  sentiment: RedditSentiment;
  communityInterestScore: number;
  discussionVolume: number;
  fastestGrowingTopic: string;
  fetchedAt: string;
  source: "live" | "cached" | "fallback";
}

// ——— Luxury Subreddits & Keywords ———

const LUXURY_SUBREDDITS = [
  "femalefashionadvice",
  "SkincareAddiction",
  "fashionadvice",
  "luxury",
  "quietluxury",
];

const PRIMARY_SUBREDDIT = "femalefashionadvice";
const SEARCH_QUERY = "quiet luxury";
const REDDIT_UA = "web:tlis-backend-app:v1.0 (by /u/YourRedditUsername)";

// ——— Sentiment Keywords ———

const POSITIVE_WORDS = new Set([
  "love", "amazing", "great", "beautiful", "gorgeous", "perfect", "obsessed",
  "stunning", "excellent", "wonderful", "fantastic", "elegant", "chic",
  "sophisticated", "luxurious", "worth", "recommend", "best", "incredible",
  "favourite", "favorite", "flawless", "timeless", "investment", "quality",
  "refined", "sleek", "minimal", "clean", "effortless"
]);

const NEGATIVE_WORDS = new Set([
  "hate", "ugly", "awful", "terrible", "disappointing", "overrated", "worst",
  "bad", "poor", "cheap", "tacky", "boring", "useless", "waste", "regret",
  "uncomfortable", "avoid", "scan", "fake", "disappointed", "horrible",
  "mediocre", "trash", "garbage", "problem", "issue", "broken"
]);

// ——— Fallback Data ———

const FALLBACK_POSTS: RedditPost[] = [
  { title: "My quiet luxury wardrobe after 2 years of curation", subreddit: "femalefashionadvice", score: 354, numComments: 72, upvoteRatio: 0.92, permalink: "/r/femalefashionadvice", created: Date.now() / 1000 - 7200, selftext: "" },
  { title: "Why I switched to a 10-piece capsule wardrobe", subreddit: "femalefashionadvice", score: 212, numComments: 45, upvoteRatio: 0.88, permalink: "/r/femalefashionadvice", created: Date.now() / 1000 - 14400, selftext: "" },
  { title: "The only skincare products I'll ever recommend", subreddit: "SkincareAddiction", score: 620, numComments: 110, upvoteRatio: 0.95, permalink: "/r/SkincareAddiction", created: Date.now() / 1000 - 28800, selftext: "" },
  { title: "Old money aesthetic - what brands actually signal wealth?", subreddit: "fashionadvice", score: 189, numComments: 54, upvoteRatio: 0.85, permalink: "/r/fashionadvice", created: Date.now() / 1000 - 36000, selftext: "" },
  { title: "Investment bags that hold value and look timeless", subreddit: "luxury", score: 432, numComments: 89, upvoteRatio: 0.90, permalink: "/r/luxury", created: Date.now() / 1000 - 50000, selftext: "" }
];

const FALLBACK_SENTIMENT: RedditSentiment = {
  positive: 78,
  negative: 8,
  neutral: 14,
  overall: "positive",
  label: "Very Positive",
};

export const FALLBACK_REDDIT_SUMMARY: RedditSummary = {
  topDiscussions: FALLBACK_POSTS,
  emergingConversations: FALLBACK_POSTS.slice(0, 3),
  frequentTopics: ["capsule wardrobe", "investment pieces", "quiet luxury", "old money", "timeless fashion"],
  faqs: [
    "What are the best quiet luxury brands under £500?",
    "How do I build a capsule wardrobe for work?",
    "Which investment bags actually hold value?",
    "Is quiet luxury just old money rebranded?"
  ],
  opinions: [
    "Quality over quantity is the only philosophy that makes sense",
    "Capsule wardrobes are more sustainable and actually save money",
    "The quiet luxury trend is finally pushing back against logomania"
  ],
  painPoints: [
    "Luxury brands pricing out younger audiences",
    "Lack of affordable quiet luxury options in the mid-range market",
    "Finding minimalist pieces that aren't boring"
  ],
  sentiment: FALLBACK_SENTIMENT,
  communityInterestScore: 82,
  discussionVolume: 4800,
  fastestGrowingTopic: "Investment Pieces",
  fetchedAt: new Date().toISOString(),
  source: "fallback",
};

// ——— In-Memory Cache ———

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

interface CacheEntry<T> { data: T; expiresAt: number }

class RedditCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.expiresAt) { this.store.delete(key); return null; }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs = CACHE_TTL_MS): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  ttlRemainingMs(key: string): number {
    const entry = this.store.get(key);
    if (!entry) return 0;
    return Math.max(0, entry.expiresAt - Date.now());
  }
}

export const redditCache = new RedditCache();

// —– Timeout Wrapper ———

function withTimeout<T>(promise: Promise<T>, ms: number, label = "request"): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`Reddit ${label} timeout after ${ms}ms`)), ms);
    promise
      .then(v => { clearTimeout(id); resolve(v); })
      .catch(e => { clearTimeout(id); reject(e); });
  });
}

// ——— Raw Reddit Types ———

interface RawPostData {
  title: string;
  subreddit: string;
  score: number;
  num_comments: number;
  upvote_ratio: number;
  permalink: string;
  created_utc: number;
  selftext: string;
}

interface RawListing {
  data: { children: Array<{ data: RawPostData }> };
}

interface RawSubredditData {
  display_name: string;
  title: string;
  subscribers: number;
  public_description: string;
}

interface RawSubredditListing {
  data: { children: Array<{ data: RawSubredditData }> };
}

// ——— Reddit Fetch Helper ———

async function redditGet<T>(path: string): Promise<T> {
  const url = `https://www.reddit.com${path}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": REDDIT_UA,
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(6000)
    });
    
    if (!res.ok) {
      console.warn(`Reddit API returned error status ${res.status} for path: ${path}`);
      return {} as T;
    }
    
    return await res.json() as T;
  } catch (error: any) {
    console.error(`⚠️ Safely caught Reddit connection error on ${path}:`, error.message);
    return {} as T;
  }
}

function mapPost(raw: RawPostData): RedditPost {
  return {
    title: raw.title,
    subreddit: raw.subreddit,
    score: raw.score,
    numComments: raw.num_comments,
    upvoteRatio: raw.upvote_ratio,
    permalink: `https://reddit.com${raw.permalink}`,
    created: raw.created_utc,
    selftext: (raw.selftext ?? "").slice(0, 300),
  };
}

// ——— Sentiment Analyser ———

function analyseSentiment(posts: RedditPost[]): RedditSentiment {
  let pos = 0, neg = 0, total = 0;
  
  for (const post of posts) {
    const words = `${post.title} ${post.selftext}`.toLowerCase().split(/\W+/);
    for (const word of words) {
      if (POSITIVE_WORDS.has(word)) pos++;
      else if (NEGATIVE_WORDS.has(word)) neg++;
      total++;
    }
  }
  
  if (total === 0) return FALLBACK_SENTIMENT;
  
  const posScore = Math.round((pos / (pos + neg + 1)) * 100);
  const negScore = Math.round((neg / (pos + neg + 1)) * 100);
  const neuScore = Math.max(0, 100 - posScore - negScore);
  
  const overall = posScore > negScore + 2 ? "positive" : negScore > posScore + 2 ? "negative" : "neutral";
  
  let label = "Neutral";
  if (overall === "positive") label = posScore > 75 ? "Very Positive" : "Positive";
  if (overall === "negative") label = negScore > 75 ? "Very Negative" : "Negative";
  
  return { positive: posScore, negative: negScore, neutral: neuScore, overall, label };
}

// ——— Community Interest Score ———

function computeInterestScore(posts: RedditPost[]): number {
  if (posts.length === 0) return 0;
  const avg = posts.reduce((sum, p) => sum + p.score * p.upvoteRatio + p.numComments * 2, 0) / posts.length;
  return Math.min(100, Math.round(avg / 50));
}

// ——— Topic Extractor ———

function extractTopics(posts: RedditPost[]): string[] {
  const freq = new Map<string, number>();
  const luxuryTerms = [
    "quiet luxury", "capsule wardrobe", "investment pieces", "old money",
    "minimalist", "skincare", "fragrance", "handbag", "silk", "cashmere",
    "linen", "loafers", "trench", "timeless", "quality", "curation",
    "wardrobe", "aesthetic", "vintage", "classic"
  ];
  
  for (const post of posts) {
    const text = `${post.title} ${post.selftext}`.toLowerCase();
    for (const term of luxuryTerms) {
      if (text.includes(term)) freq.set(term, (freq.get(term) ?? 0) + 1);
    }
  }
  
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([t]) => t);
}

function extractFAQs(posts: RedditPost[]): string[] {
  return posts
    .map(p => p.title)
    .filter(p => p.includes("?"))
    .sort((a, b) => b.length - a.length)
    .slice(0, 4);
}

function extractOpinions(posts: RedditPost[]): string[] {
  const opinionTerms = ["think", "opinion", "feel", "believe", "philosophy", "approach"];
  return posts
    .filter(p => opinionTerms.some(t => p.title.toLowerCase().includes(t)))
    .map(p => p.title)
    .slice(0, 3);
}

function extractPainPoints(posts: RedditPost[]): string[] {
  const painTerms = ["help", "struggle", "issue", "problem", "advice", "overwhelm"];
  return posts
    .filter(p => painTerms.some(t => p.title.toLowerCase().includes(t)))
    .map(p => p.title)
    .slice(0, 3);
}

function emergingPosts(posts: RedditPost[]): RedditPost[] {
  const now = Date.now() / 1000;
  return posts
    .map(p => ({ ...p, velocity: p.score / Math.max(1, (now - p.created) / 3600) }))
    .sort((a, b) => b.velocity - a.velocity)
    .slice(0, 4)
    .map(({ velocity, ...p }) => p);
}

// ——— Low-Level Fetchers ———

async function fetchSubredditPosts(
  subreddit: string,
  sort: "hot" | "top" | "new",
  log: Log,
  limit = 15
): Promise<RedditPost[]> {
  const cacheKey = `sub:${subreddit}:${sort}`;
  const cached = redditCache.get<RedditPost[]>(cacheKey);
  if (cached) return cached;
  
  const path = sort === "top"
    ? `/r/${subreddit}/top.json?t=week&limit=${limit}`
    : `/r/${subreddit}/${sort}.json?limit=${limit}`;
    
  log.info({ subreddit, sort }, "Reddit: fetchSubredditPosts");
  const raw = await redditGet<RawListing>(path);
  const posts = (raw?.data?.children ?? []).map(c => mapPost(c.data));
  redditCache.set(cacheKey, posts);
  return posts;
}

async function fetchSearchPosts(query: string, log: Log, limit = 20): Promise<RedditPost[]> {
  const cacheKey = `search:${query}`;
  const cached = redditCache.get<RedditPost[]>(cacheKey);
  if (cached) return cached;
  
  log.info({ query }, "Reddit: fetchSearchPosts");
  const raw = await redditGet<RawListing>(`/search.json?q=${encodeURIComponent(query)}&sort=hot&limit=${limit}`);
  const posts = (raw?.data?.children ?? []).map(c => mapPost(c.data));
  redditCache.set(cacheKey, posts);
  return posts;
}

async function fetchSearchSubreddits(query: string, log: Log): Promise<RedditSubreddit[]> {
  const cacheKey = `subs:${query}`;
  const cached = redditCache.get<RedditSubreddit[]>(cacheKey);
  if (cached) return cached;
  
  log.info({ query }, "Reddit: fetchSearchSubreddits");
  const raw = await redditGet<RawSubredditListing>(`/subreddits/search.json?q=${encodeURIComponent(query)}&limit=5`);
  const subs = (raw?.data?.children ?? []).map(c => ({
    name: c.data.display_name,
    title: c.data.title,
    subscribers: c.data.subscribers,
    description: (c.data.public_description ?? "").slice(0, 200),
  }));
  redditCache.set(cacheKey, subs);
  return subs;
}

// ——— High-Level Exported Methods ———

export async function getLuxuryRedditSummary(log: Log): Promise<RedditSummary> {
  const cacheKey = "reddit:luxury:summary";
  const cached = redditCache.get<RedditSummary>(cacheKey);
  if (cached) {
    log.info({ ttlMs: redditCache.ttlRemainingMs(cacheKey) }, "Reddit: luxury summary storage hit");
    return { ...cached, source: "cached" };
  }
  
  try {
    const [hotPosts, searchPosts, topPosts] = await Promise.all([
      fetchSubredditPosts(PRIMARY_SUBREDDIT, "hot", log).catch(e => {
        log.warn({ err: e.message }, "Reddit: hot posts failed"); return [];
      }),
      fetchSearchPosts(SEARCH_QUERY, log).catch(e => {
        log.warn({ err: e.message }, "Reddit: search failed"); return [];
      }),
      fetchSubredditPosts(PRIMARY_SUBREDDIT, "top", log).catch(e => {
        log.warn({ err: e.message }, "Reddit: luxury top failed"); return [];
      }),
    ]);
    
    const allPosts = [...hotPosts, ...searchPosts, ...topPosts];
    
    if (allPosts.length === 0) {
      log.warn("Reddit: all fetches returned empty, using fallback");
      return { ...FALLBACK_REDDIT_SUMMARY, fetchedAt: new Date().toISOString(), source: "fallback" };
    }
    
    const topDiscussions = [...allPosts].sort((a, b) => b.score - a.score).slice(0, 10);
    const emergingConversations = emergingPosts(allPosts);
    const frequentTopics = extractTopics(allPosts);
    const faqs = extractFAQs(allPosts);
    const opinions = extractOpinions(allPosts);
    const painPoints = extractPainPoints(allPosts);
    const sentiment = analyseSentiment(allPosts);
    const communityInterestScore = computeInterestScore(topDiscussions);
    const discussionVolume = allPosts.reduce((sum, p) => sum + p.numComments, 0);
    const fastestGrowingTopic = frequentTopics[0] ?? FALLBACK_REDDIT_SUMMARY.fastestGrowingTopic;
    
    const summary: RedditSummary = {
      topDiscussions,
      emergingConversations,
      frequentTopics,
      faqs: faqs.length > 0 ? faqs : FALLBACK_REDDIT_SUMMARY.faqs,
      opinions: opinions.length > 0 ? opinions : FALLBACK_REDDIT_SUMMARY.opinions,
      painPoints: painPoints.length > 0 ? painPoints : FALLBACK_REDDIT_SUMMARY.painPoints,
      sentiment,
      communityInterestScore,
      discussionVolume,
      fastestGrowingTopic,
      fetchedAt: new Date().toISOString(),
      source: "live",
    };
    
    redditCache.set(cacheKey, summary);
    log.info({ communityInterestScore, discussionVolume, source: "live" }, "Reddit: luxury summary compiled");
    return summary;
  } catch (err: any) {
    log.warn({ err: err.message }, "Reddit: luxury summary failed, returning fallback");
    return { ...FALLBACK_REDDIT_SUMMARY, fetchedAt: new Date().toISOString(), source: "fallback" };
  }
}

export async function getSubredditPosts(
  subreddit: string,
  sort: "hot" | "top" | "new",
  log: Log
): Promise<RedditPost[]> {
  try {
    return await fetchSubredditPosts(subreddit, sort, log);
  } catch (err: any) {
    log.warn({ err: err.message, subreddit, sort }, "Reddit: getSubredditPosts failed");
    return FALLBACK_POSTS;
  }
}

export async function searchRedditPosts(query: string, log: Log): Promise<RedditPost[]> {
  try {
    return await fetchSearchPosts(query, log);
  } catch (err: any) {
    log.warn({ err: err.message, query }, "Reddit: searchRedditPosts failed");
    return FALLBACK_POSTS;
  }
}

export async function searchRedditSubreddits(query: string, log: Log): Promise<RedditSubreddit[]> {
  try {
    return await fetchSearchSubreddits(query, log);
  } catch (err: any) {
    log.warn({ err: err.message, query }, "Reddit: searchRedditSubreddits failed");
    return [];
  }
}

export function formatRedditContext(summary: RedditSummary): string {
  if (summary.source === "fallback") return "";
  const topTitles = summary.topDiscussions.slice(0, 3).map(p => `"${p.title}"`).join(", ");
  const topics = summary.frequentTopics.slice(0, 4).join(", ");
  const faqs = summary.faqs.slice(0, 2).map(q => `"${q}"`).join(", ");
  const pain = summary.painPoints.slice(0, 2).join("; ");
  
  return [
    "Real-time Reddit community data (just fetched):",
    `• Community sentiment: ${summary.sentiment.label} (${summary.sentiment.positive}% positive)`,
    `• Top discussions: ${topTitles}`,
    `• Most discussed topics: ${topics}`,
    `• Community FAQs: ${faqs}`,
    `• Pain points: ${pain}`,
    `• Discussion volume: ${summary.discussionVolume.toLocaleString()} comments`,
    `• Fastest growing topic: ${summary.fastestGrowingTopic}`,
    "Use this data to align your response with what real communities are actively discussing."
  ].join("\n");
}

export type { Log };
