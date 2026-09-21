import type { ApiPerformancePost } from "@/lib/api";

// A "winner" is judged against the same platform's own average, never
// across platforms — a YouTube like and a Facebook like come from
// different audiences and aren't the same size of win. Views are left out
// of the score for the same reason (only YouTube reports them); the score
// is likes + comments + shares.
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
  return (post.metrics.likes ?? 0) + (post.metrics.comments ?? 0) + (post.metrics.shares ?? 0);
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

// The single strongest winner, if any post qualifies.
export function bestWinner(
  posts: ApiPerformancePost[],
  scores: Map<string, PostScore>,
): { post: ApiPerformancePost; score: PostScore } | null {
  let best: { post: ApiPerformancePost; score: PostScore } | null = null;
  for (const post of posts) {
    const score = scores.get(post.id);
    if (!isWinner(score)) continue;
    if (!best || score!.multiple > best.score.multiple) best = { post, score: score! };
  }
  return best;
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
