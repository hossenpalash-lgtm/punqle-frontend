import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PunqleLogo } from "@/components/PunqleLogo";
import { LegalFooter } from "@/components/LegalFooter";
import { CopyButton, PhotoCaptionTool } from "@/components/tools/PhotoCaptionTool";
import { NICHE_SLUGS, TOOL_PAGES, type ToolPageData } from "@/lib/tool-pages";

// Public, server-rendered pages (see PUBLIC_ROUTES handling in __root.tsx): a free tool that leads to Punqle.
function ToolsHeader() {
  return (
    <header className="flex justify-center px-4 pt-4 sm:px-6">
      <div className="flex w-full max-w-[860px] items-center justify-between gap-2 py-3">
        <Link to="/" search={{ tab: "home" }} className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <PunqleLogo className="h-4 w-4" />
          </div>
          <span className="font-display text-base font-extrabold text-foreground">Punqle</span>
        </Link>
        <Link
          to="/"
          search={{ tab: "home" }}
          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          Try Punqle free
        </Link>
      </div>
    </header>
  );
}

function Breadcrumb({ label }: { label?: string }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
      <Link to="/tools" className="hover:text-foreground">
        Free tools
      </Link>
      {label && (
        <>
          <span aria-hidden="true"> / </span>
          <span className="text-foreground">{label}</span>
        </>
      )}
    </nav>
  );
}

export function ToolPage({ page }: { page: ToolPageData }) {
  const related = NICHE_SLUGS.filter((s) => s !== page.slug).map((s) => TOOL_PAGES[s]);
  return (
    <div className="flex min-h-screen w-full flex-col">
      <ToolsHeader />
      <main className="mx-auto w-full max-w-[860px] flex-1 px-5 py-6 sm:px-6">
        <Breadcrumb label={page.label} />
        <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-accent">Free tool &middot; no login</p>
        <h1 className="mt-2 text-balance font-display text-3xl font-extrabold text-foreground sm:text-4xl">{page.h1}</h1>
        <div className="mt-4 flex max-w-[680px] flex-col gap-3 text-[15px] leading-relaxed text-muted-foreground">
          {page.intro.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>

        <div className="mt-8">
          <PhotoCaptionTool defaultType={page.businessType} />
        </div>

        {page.groups.length > 0 && (
          <section className="mt-14" aria-labelledby="ready-heading">
            <h2 id="ready-heading" className="font-display text-2xl font-extrabold text-foreground">
              30 captions to copy
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Tap Copy, paste into Instagram, and change any word to sound like you.</p>
            <div className="mt-6 flex flex-col gap-8">
              {page.groups.map((g) => (
                <div key={g.title}>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</h3>
                  <ul className="mt-3 flex flex-col gap-2">
                    {g.captions.map((c) => (
                      <li
                        key={c}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-3.5"
                      >
                        <p className="text-[15px] leading-relaxed text-foreground">{c}</p>
                        <CopyButton text={c} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-14" aria-labelledby="tips-heading">
          <h2 id="tips-heading" className="font-display text-2xl font-extrabold text-foreground">
            {page.groups.length > 0 ? "Tips for better posts" : "Tips for better captions"}
          </h2>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            {page.tips.map((t) => (
              <div key={t.title}>
                <dt className="text-[15px] font-semibold text-foreground">{t.title}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.body}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-14" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="font-display text-2xl font-extrabold text-foreground">
            Questions
          </h2>
          <div className="mt-4 divide-y divide-border border-y border-border">
            {page.faq.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="cursor-pointer list-none text-[15px] font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">
                  {f.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-3xl border border-border bg-muted p-6 sm:p-8">
          <h2 className="font-display text-2xl font-extrabold text-foreground">Captions are the easy part</h2>
          <p className="mt-2 max-w-[560px] text-[15px] leading-relaxed text-muted-foreground">
            Punqle turns one photo into the whole post: the ad image, a short video, the caption and a week of ideas, so
            you spend minutes on marketing instead of hours.
          </p>
          <Link
            to="/"
            search={{ tab: "home" }}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Try Punqle free <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>

        <nav className="mt-14" aria-label="More free tools">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">More caption ideas</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {page.slug !== "caption-generator-from-photo" && (
              <li>
                <Link
                  to="/tools/$slug"
                  params={{ slug: "caption-generator-from-photo" }}
                  className="inline-block rounded-full border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
                >
                  Caption generator from photo
                </Link>
              </li>
            )}
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  to="/tools/$slug"
                  params={{ slug: r.slug }}
                  className="inline-block rounded-full border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
                >
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
      <LegalFooter className="mt-8 border-t border-border" />
    </div>
  );
}

export function ToolsIndex() {
  const pages = Object.values(TOOL_PAGES);
  return (
    <div className="flex min-h-screen w-full flex-col">
      <ToolsHeader />
      <main className="mx-auto w-full max-w-[860px] flex-1 px-5 py-6 sm:px-6">
        <Breadcrumb />
        <h1 className="mt-6 text-balance font-display text-3xl font-extrabold text-foreground sm:text-4xl">
          Free tools for small businesses
        </h1>
        <p className="mt-4 max-w-[640px] text-[15px] leading-relaxed text-muted-foreground">
          Simple tools from the team behind Punqle. No login, no credit card. Start with a photo and get captions,
          hashtags and ad headlines that fit your business.
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {pages.map((p) => (
            <li key={p.slug}>
              <Link
                to="/tools/$slug"
                params={{ slug: p.slug }}
                className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-muted"
              >
                <span className="font-display text-lg font-extrabold text-foreground">{p.h1}</span>
                <span className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.metaDescription}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <LegalFooter className="mt-8 border-t border-border" />
    </div>
  );
}
