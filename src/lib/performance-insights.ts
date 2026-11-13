import type { ApiPerformancePost } from "@/lib/api";

// A "winner" is judged against the same platform's own average, never
// across platforms — a YouTube like and a Facebook like come from
// different audiences and aren't the same size of win. Views and reach are
// left out of the score for the same reason (not every platform reports
// them); the score is likes + comments + shares + saves (saves only exist
// on Instagram, where they are the strongest "I want this" signal).
//
// The thresholds keep a tiny sample from crowning a winner: three
// measured posts on a platform before any of them can be compared, a
// clear 2x lead, and a real floor of interactions so 2 vs 0.5 doesn't
// count. The post's own numbers stay inside the average it's compared to,
// which makes the lead a little harder to reach, not easier.
export const MIN_POSTS_PER_PLATFORM = 3;
export const WINNER_MULTIPLE = 2;
export const MIN_WINNER_ENGAGEMENT = 5;

// Groups (angle / style / goal) lead when their posts average clearly
// above the platform averages they were measured against.
export const MIN_GROUP_POSTS = 2;
export const LEADER_MULTIPLE = 1.3;

export function engagementOf(post: ApiPerformancePost): number | null {
  if (!post.metrics) return null;
  return (
    (post.metrics.likes ?? 0) + (post.metrics.comments ?? 0) + (post.metrics.shares ?? 0) + (post.metrics.saves ?? 0)
  );
}

export interface PostScore {
  engagement: number;
  multiple: number;
}

// post id -> how many times its platform's average it earned. Platforms
// with fewer than MIN_POSTS_PER_PLATFORM measured posts (or an average of
// zero) are left out entirely — no score is better than a meaningless one.
export function scorePosts(posts: ApiPerformancePost[]): Map<string, PostScore> {
  const byPlatform = new Map<string, { post: ApiPerformancePost; engagement: number }[]>();
  for (const post of posts) {
    const engagement = engagementOf(post);
    if (engagement === null) continue;
    const list = byPlatform.get(post.platform) ?? [];
    list.push({ post, engagement });
    byPlatform.set(post.platform, list);
  }
  const scores = new Map<string, PostScore>();
  for (const list of byPlatform.values()) {
    if (list.length < MIN_POSTS_PER_PLATFORM) continue;
    const average = list.reduce((sum, item) => sum + item.engagement, 0) / list.length;
    if (average <= 0) continue;
    for (const { post, engagement } of list) {
      scores.set(post.id, { engagement, multiple: engagement / average });
    }
  }
  return scores;
}

export function isWinner(score: PostScore | undefined): boolean {
  return !!score && score.multiple >= WINNER_MULTIPLE && score.engagement >= MIN_WINNER_ENGAGEMENT;
}

// The best posts, strongest first (up to `max`), instead of one crowned winner. Same guards as a winner (3 measured posts on
// the platform, a real floor of interactions) but a lower bar for the multiple, so a clear step above your average still
// shows. `strict` marks the ones that also clear the full 2x winner bar; only those get the trophy.
export const TOP_MIN_MULTIPLE = 1.2;
export interface TopPost {
  post: ApiPerformancePost;
  score: PostScore;
  strict: boolean;
}
export function topPosts(posts: ApiPerformancePost[], scores: Map<string, PostScore>, max = 3): TopPost[] {
  const out: TopPost[] = [];
  for (const post of posts) {
    const score = scores.get(post.id);
    if (!score || score.engagement < MIN_WINNER_ENGAGEMENT || score.multiple < TOP_MIN_MULTIPLE) continue;
    out.push({ post, score, strict: isWinner(score) });
  }
  out.sort((a, b) => b.score.multiple - a.score.multiple);
  return out.slice(0, max);
}

// Engagement rate = interactions (likes, comments, shares, saves) as a share of the people who saw the post: reach when the
// platform gives it, otherwise views. Below MIN_RATE_BASE people the percentage swings wildly (1 like on 3 views = 33%), so
// no rate is shown at all rather than a misleading one.
export const MIN_RATE_BASE = 20;
export interface EngagementRate {
  pct: number;
  per: "reach" | "views";
}
export function engagementRate(post: ApiPerformancePost): EngagementRate | null {
  if (!post.metrics) return null;
  const interactions = engagementOf(post) ?? 0;
  const { reach, views } = post.metrics;
  if (reach !== null && reach !== undefined && reach >= MIN_RATE_BASE) return { pct: (interactions / reach) * 100, per: "reach" };
  if (views !== null && views !== undefined && views >= MIN_RATE_BASE) return { pct: (interactions / views) * 100, per: "views" };
  return null;
}
export function formatRate(rate: EngagementRate): string {
  return `${rate.pct >= 10 ? rate.pct.toFixed(0) : rate.pct.toFixed(1)}%`;
}

// Numbers a platform does not hand to apps, said out loud so a missing number is not mistaken for zero or for a bug. Only what
// is documented: TikTok's API returns four counts (views, likes, comments, shares) and nothing else; Facebook's video posts
// have no shares field. A number that is just waiting on a permission is NOT listed here (those have their own unlock banner).
export function notSharedNote(post: ApiPerformancePost): string | null {
  const m = post.metrics;
  if (!m) return null;
  if (post.platform === "tiktok") {
    const missing: string[] = [];
    if (m.reach == null) missing.push("reach");
    if (m.saves == null) missing.push("saves");
    if (m.watch_minutes == null && m.avg_view_seconds == null) missing.push("watch time");
    if (missing.length === 0) return null;
    const list = missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`;
    return `TikTok doesn't share ${list} with apps.`;
  }
  if (post.platform === "facebook" && m.shares == null) return "Facebook doesn't report shares for video posts.";
  return null;
}

export type TagDimension = "angle" | "style" | "goal";

export interface GroupLeader {
  dimension: TagDimension;
  value: string;
  averageMultiple: number;
  postCount: number;
}

// For each tag (angle / style / goal): the group whose scored posts do
// best against their own platform's average. Needs at least two different
// groups to compare and at least MIN_GROUP_POSTS in the leader, and only
// reports a lead that clears LEADER_MULTIPLE.
export function groupLeaders(posts: ApiPerformancePost[], scores: Map<string, PostScore>): GroupLeader[] {
  const leaders: GroupLeader[] = [];
  for (const dimension of ["angle", "style", "goal"] as TagDimension[]) {
    const groups = new Map<string, number[]>();
    for (const post of posts) {
      const value = post[dimension];
      const score = scores.get(post.id);
      if (!value || !score) continue;
      const list = groups.get(value) ?? [];
      list.push(score.multiple);
      groups.set(value, list);
    }
    if (groups.size < 2) continue;
    let leader: GroupLeader | null = null;
    for (const [value, multiples] of groups) {
      if (multiples.length < MIN_GROUP_POSTS) continue;
      const averageMultiple = multiples.reduce((a, b) => a + b, 0) / multiples.length;
      if (!leader || averageMultiple > leader.averageMultiple) {
        leader = { dimension, value, averageMultiple, postCount: multiples.length };
      }
    }
    if (leader && leader.averageMultiple >= LEADER_MULTIPLE) leaders.push(leader);
  }
  return leaders;
}
