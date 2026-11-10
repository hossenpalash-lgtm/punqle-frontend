import { AlertCircle, Check, CheckCircle2, ChevronRight, Facebook, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchMetaStatus, getMetaConnectUrl, publishVideoToMeta, type ApiMetaPublishResponse } from "@/lib/api";
import { showToast } from "@/components/GlassToast";
import { PlatformTile } from "@/components/PlatformTile";

// Post a finished video to the Facebook Page and/or as an Instagram Reel. The picture version is PublishToMeta; this one is
// deliberately smaller: videos post right now only (a scheduled video would need its own tested path on each platform), and
// the caption is editable here because a video has no headline text to borrow it from.
export function PublishVideoToMeta({
  videoUrl,
  headline,
  videoKept,
  goal,
  angle,
  style,
  startOpen,
  initial,
}: {
  videoUrl: string | null; // a "data:video/mp4;base64,..." URL
  headline: string;
  videoKept?: boolean; // the server keeps this video 14 days (Recent videos), so connecting does not lose it
  goal?: string | null;
  angle?: string | null;
  style?: string | null;
  startOpen?: boolean; // open the form straight away (the caller already showed a button for it)
  initial?: "facebook" | "instagram"; // which platform the customer tapped; the other one starts un-ticked
}) {
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [connected, setConnected] = useState(false);
  const [pageName, setPageName] = useState<string | null>(null);
  const [hasInstagram, setHasInstagram] = useState(false);
  const [igName, setIgName] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const [expanded, setExpanded] = useState(!!startOpen);
  const [caption, setCaption] = useState("");
  const [postFacebook, setPostFacebook] = useState(true);
  const [postInstagram, setPostInstagram] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<ApiMetaPublishResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!result) return;
    if (result.facebook?.posted) showToast("Posted to Facebook", { tone: "success" });
    if (result.instagram?.posted) showToast("Posted to Instagram as a Reel", { tone: "success" });
    if (result.facebook && !result.facebook.posted) showToast(`Facebook: ${result.facebook.error}`, { tone: "error" });
    if (result.instagram && !result.instagram.posted) showToast(`Instagram: ${result.instagram.error}`, { tone: "error" });
  }, [result]);

  useEffect(() => {
    fetchMetaStatus()
      .then((r) => {
        setConnected(r.connected);
        setPageName(r.page_name);
        setHasInstagram(!!r.ig_username);
        setIgName(r.ig_username || null);
        if (initial === "instagram") {
          setPostFacebook(false);
          setPostInstagram(!!r.ig_username);
        } else if (initial === "facebook") {
          setPostInstagram(false);
        } else {
          setPostInstagram(!!r.ig_username);
        }
      })
      .catch(() => {
        // Stays "not connected": a secondary action on the result screen, not worth a loud error.
      })
      .finally(() => setCheckingStatus(false));
  }, []);

  useEffect(() => {
    setCaption(headline || "");
  }, [headline]);

  const handleConnect = async () => {
    if (connecting) return;
    const warning = videoKept
      ? "Connecting will leave this page. Your video stays in Recent videos for 14 days: open it there and tap Post. Continue?"
      : "Connecting will leave this page — your current video won't be saved. Continue?";
    if (!window.confirm(warning)) return;
    setConnecting(true);
    setError(null);
    try {
      const r = await getMetaConnectUrl();
      window.location.href = r.authorize_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't connect to Facebook.");
      setConnecting(false);
    }
  };

  const handlePublish = async () => {
    if (publishing || !videoUrl || (!postFacebook && !postInstagram)) return;
    setPublishing(true);
    setError(null);
    setResult(null);
    try {
      setResult(await publishVideoToMeta(videoUrl, caption.trim(), postFacebook, postInstagram, goal, angle, style));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't publish. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  if (checkingStatus) return null;

  if (!connected) {
    return (
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground disabled:opacity-60"
      >
        {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Facebook className="h-4 w-4" />}
        Connect Facebook &amp; Instagram to post directly
      </button>
    );
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <span className="flex -space-x-2">
          <PlatformTile platform="facebook" size="lg" ring />
          {hasInstagram && <PlatformTile platform="instagram" size="lg" ring />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[15px] font-extrabold text-foreground">
            Post to Facebook{hasInstagram ? " & Instagram" : ""}
          </span>
          <span className="block text-xs text-muted-foreground">{hasInstagram ? "Facebook video and Instagram Reel, right now" : "Facebook video, right now"}</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
    );
  }

  // After a real post on at least one platform, hide the button: a second click would post a genuine duplicate.
  const alreadyPosted = !!(result?.facebook?.posted || result?.instagram?.posted);

  const tile = (key: "facebook" | "instagram", on: boolean, setOn: (v: boolean) => void, name: string, sub: string, disabled = false) => (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      disabled={disabled || alreadyPosted}
      onClick={() => setOn(!on)}
      className={[
        "relative flex flex-col items-start gap-2 rounded-2xl p-3 text-left transition-colors",
        on ? "border-2 border-foreground bg-card" : "border border-border bg-secondary/60",
        disabled ? "cursor-not-allowed opacity-50" : "",
      ].join(" ")}
    >
      <PlatformTile platform={key} size="lg" />
      <span className="min-w-0 max-w-full">
        <span className="block text-sm font-bold text-foreground">{name}</span>
        <span className="block truncate text-xs text-muted-foreground">{sub}</span>
      </span>
      <span
        className={[
          "absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full border",
          on ? "border-foreground bg-foreground text-background" : "border-border bg-background text-transparent",
        ].join(" ")}
        aria-hidden="true"
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    </button>
  );

  return (
    <div className="mb-3 overflow-hidden rounded-3xl border border-border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center gap-3 px-4 pb-1 pt-4">
        <span className="flex -space-x-2">
          <PlatformTile platform="facebook" size="md" ring />
          {hasInstagram && <PlatformTile platform="instagram" size="md" ring />}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-base font-extrabold leading-tight text-foreground">Post to {pageName}</p>
          <p className="text-xs text-muted-foreground">Pick where it goes. It posts right now.</p>
        </div>
      </div>

      <div className="space-y-3.5 p-4">
        <div className="grid grid-cols-2 gap-2.5">
          {tile("facebook", postFacebook, setPostFacebook, "Facebook", pageName || "Your Page")}
          {tile("instagram", postInstagram, setPostInstagram, "Instagram", hasInstagram ? (igName ? `@${igName}` : "Linked") : "Not linked", !hasInstagram)}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Caption</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            maxLength={2200}
            disabled={alreadyPosted}
            className="w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
        </div>

        {initial === "instagram" && !hasInstagram && (
          <p className="-mt-1 text-xs font-medium text-destructive">
            This Facebook Page has no Instagram account linked. Link one to the Page in Instagram's settings, then reconnect here.
          </p>
        )}

        {postInstagram && <p className="-mt-1 text-xs text-muted-foreground">On Instagram it posts as a Reel and also shows on your profile. Instagram can take up to a minute to process it, so keep this page open.</p>}

        {error && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        {result && (
          <ul className="space-y-1.5 text-sm">
            {result.facebook && (
              <li className={["flex items-center gap-2 rounded-xl px-3 py-2", result.facebook.posted ? "bg-emerald-500/10 text-foreground" : "bg-destructive/10 text-destructive"].join(" ")}>
                <PlatformTile platform="facebook" size="sm" />
                {result.facebook.posted ? "Facebook: posted" : `Facebook: ${result.facebook.error}`}
              </li>
            )}
            {result.instagram && (
              <li className={["flex items-center gap-2 rounded-xl px-3 py-2", result.instagram.posted ? "bg-emerald-500/10 text-foreground" : "bg-destructive/10 text-destructive"].join(" ")}>
                <PlatformTile platform="instagram" size="sm" />
                {result.instagram.posted ? "Instagram: posted as a Reel" : `Instagram: ${result.instagram.error}`}
              </li>
            )}
          </ul>
        )}

        {alreadyPosted ? (
          <button
            onClick={() => setExpanded(false)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground"
          >
            <CheckCircle2 className="h-4 w-4" />
            Done
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handlePublish}
              disabled={publishing || (!postFacebook && !postInstagram) || !videoUrl}
              className="flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
              style={{ background: "var(--gradient-primary)" }}
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {publishing ? "Posting… keep this page open" : "Publish now"}
            </button>
            <button
              onClick={() => setExpanded(false)}
              disabled={publishing}
              className="shrink-0 rounded-full bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
