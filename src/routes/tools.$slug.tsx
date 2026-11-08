import { createFileRoute, notFound } from "@tanstack/react-router";
import { ToolPage } from "@/components/tools/ToolPage";
import { TOOL_PAGES, toolUrl } from "@/lib/tool-pages";

export const Route = createFileRoute("/tools/$slug")({
  loader: ({ params }) => {
    if (!TOOL_PAGES[params.slug]) throw notFound();
    return null;
  },
  head: ({ params }) => {
    const page = TOOL_PAGES[params.slug];
    if (!page) return {};
    const url = toolUrl(page.slug);
    const jsonLd = [
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: page.h1,
        url,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Any",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        publisher: { "@type": "Organization", name: "Punqle", url: "https://www.punqle.com/" },
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: page.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ];
    return {
      meta: [
        { title: page.metaTitle },
        { name: "description", content: page.metaDescription },
        { property: "og:title", content: page.metaTitle },
        { property: "og:description", content: page.metaDescription },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: jsonLd.map((j) => ({ type: "application/ld+json", children: JSON.stringify(j) })),
    };
  },
  component: ToolRoute,
});

function ToolRoute() {
  const { slug } = Route.useParams();
  const page = TOOL_PAGES[slug];
  return page ? <ToolPage page={page} /> : null;
}
