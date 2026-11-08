import { createFileRoute } from "@tanstack/react-router";
import { ToolsIndex } from "@/components/tools/ToolPage";
import { SITE_ORIGIN } from "@/lib/tool-pages";

const TITLE = "Free Tools for Small Businesses | Punqle";
const DESCRIPTION =
  "Free, no-login tools for small businesses: Instagram captions, hashtags and ad headlines written from your own photo.";

export const Route = createFileRoute("/tools/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_ORIGIN}/tools` },
    ],
    links: [{ rel: "canonical", href: `${SITE_ORIGIN}/tools` }],
  }),
  component: ToolsIndex,
});
