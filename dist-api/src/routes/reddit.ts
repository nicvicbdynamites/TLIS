/**
 * Reddit routes — live community intelligence endpoints.
 *
 * This is the second live Research Provider for TLIS.
 * All endpoints return 200 with data — never a naked 5xx.
 *
 * GET /api/reddit/luxury-summary        — composite community dashboard summary
 * GET /api/reddit/search-posts          — search posts by keyword (?q=)
 * GET /api/reddit/search-subreddits     — search subreddits (?q=)
 * GET /api/reddit/trending-discussions  — current trending luxury discussions
 * GET /api/reddit/top-posts             — top posts for a subreddit (?subreddit=)
 * GET /api/reddit/new-posts             — new posts for a subreddit (?subreddit=)
 * GET /api/reddit/hot-posts             — hot posts for a subreddit (?subreddit=)
 * GET /api/reddit/sentiment-summary     — community sentiment analysis
 */

import { Router, type IRouter, type Request, type Response } from "express";
import {
  getLuxuryRedditSummary,
  getSubredditPosts,
  searchRedditPosts,
  searchRedditSubreddits,
  FALLBACK_REDDIT_SUMMARY,
} from "../services/reddit.js";

const router: IRouter = Router();

// ── GET /api/reddit/luxury-summary ────────────────────────────────────────
router.get("/reddit/luxury-summary", async (req: Request, res: Response) => {
  try {
    req.log.info("reddit/luxury-summary request");
    const data = await getLuxuryRedditSummary(req.log);
    res.json(data);
  } catch (err: any) {
    req.log.error({ err }, "reddit/luxury-summary unexpected error");
    res.json({ ...FALLBACK_REDDIT_SUMMARY, fetchedAt: new Date().toISOString() });
  }
});

// ── GET /api/reddit/search-posts ─────────────────────────────────────────
router.get("/reddit/search-posts", async (req: Request, res: Response) => {
  const q = (req.query.q as string | undefined)?.trim();
  if (!q) { res.status(400).json({ error: "q query param required" }); return; }

  try {
    req.log.info({ q }, "reddit/search-posts request");
    const posts = await searchRedditPosts(q, req.log);
    res.json({ query: q, posts });
  } catch (err: any) {
    req.log.error({ err }, "reddit/search-posts unexpected error");
    res.json({ query: q, posts: FALLBACK_REDDIT_SUMMARY.topDiscussions, source: "fallback" });
  }
});

// ── GET /api/reddit/search-subreddits ────────────────────────────────────
router.get("/reddit/search-subreddits", async (req: Request, res: Response) => {
  const q = (req.query.q as string | undefined)?.trim();
  if (!q) { res.status(400).json({ error: "q query param required" }); return; }

  try {
    req.log.info({ q }, "reddit/search-subreddits request");
    const subreddits = await searchRedditSubreddits(q, req.log);
    res.json({ query: q, subreddits });
  } catch (err: any) {
    req.log.error({ err }, "reddit/search-subreddits unexpected error");
    res.json({ query: q, subreddits: [], source: "fallback" });
  }
});

// ── GET /api/reddit/trending-discussions ─────────────────────────────────
router.get("/reddit/trending-discussions", async (req: Request, res: Response) => {
  try {
    req.log.info("reddit/trending-discussions request");
    const summary = await getLuxuryRedditSummary(req.log);
    res.json({ posts: summary.topDiscussions, source: summary.source });
  } catch (err: any) {
    req.log.error({ err }, "reddit/trending-discussions unexpected error");
    res.json({ posts: FALLBACK_REDDIT_SUMMARY.topDiscussions, source: "fallback" });
  }
});

// ── GET /api/reddit/top-posts ─────────────────────────────────────────────
router.get("/reddit/top-posts", async (req: Request, res: Response) => {
  const subreddit = ((req.query.subreddit as string | undefined) ?? "femalefashionadvice").trim();

  try {
    req.log.info({ subreddit }, "reddit/top-posts request");
    const posts = await getSubredditPosts(subreddit, "top", req.log);
    res.json({ subreddit, posts });
  } catch (err: any) {
    req.log.error({ err }, "reddit/top-posts unexpected error");
    res.json({ subreddit, posts: FALLBACK_REDDIT_SUMMARY.topDiscussions, source: "fallback" });
  }
});

// ── GET /api/reddit/hot-posts ─────────────────────────────────────────────
router.get("/reddit/hot-posts", async (req: Request, res: Response) => {
  const subreddit = ((req.query.subreddit as string | undefined) ?? "femalefashionadvice").trim();

  try {
    req.log.info({ subreddit }, "reddit/hot-posts request");
    const posts = await getSubredditPosts(subreddit, "hot", req.log);
    res.json({ subreddit, posts });
  } catch (err: any) {
    req.log.error({ err }, "reddit/hot-posts unexpected error");
    res.json({ subreddit, posts: FALLBACK_REDDIT_SUMMARY.topDiscussions, source: "fallback" });
  }
});

// ── GET /api/reddit/new-posts ─────────────────────────────────────────────
router.get("/reddit/new-posts", async (req: Request, res: Response) => {
  const subreddit = ((req.query.subreddit as string | undefined) ?? "femalefashionadvice").trim();

  try {
    req.log.info({ subreddit }, "reddit/new-posts request");
    const posts = await getSubredditPosts(subreddit, "new", req.log);
    res.json({ subreddit, posts });
  } catch (err: any) {
    req.log.error({ err }, "reddit/new-posts unexpected error");
    res.json({ subreddit, posts: FALLBACK_REDDIT_SUMMARY.emergingConversations, source: "fallback" });
  }
});

// ── GET /api/reddit/sentiment-summary ────────────────────────────────────
router.get("/reddit/sentiment-summary", async (req: Request, res: Response) => {
  try {
    req.log.info("reddit/sentiment-summary request");
    const summary = await getLuxuryRedditSummary(req.log);
    res.json(summary.sentiment);
  } catch (err: any) {
    req.log.error({ err }, "reddit/sentiment-summary unexpected error");
    res.json(FALLBACK_REDDIT_SUMMARY.sentiment);
  }
});

export default router;
