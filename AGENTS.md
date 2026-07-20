# AGENTS.md

## Scope

This repo is **originalfreenations.com** (Original Free Nations) — an **Eleventy
v4 + Nunjucks** static site built on the **11ty-Headline** theme (Ghost's
"Headline" news theme, converted from Handlebars). There is no Ghost backend and
no WordPress backend: posts, pages, authors and site config are Markdown/YAML
under `src/content/` and `src/_data/`.

`originalfreenations.WordPress.2026-07-08.xml` at the repo root is the original
WordPress export, kept as the **migration source of truth**. Check content
questions against it. Do not delete it.

## Commands

```bash
npm install
npm run dev      # dev server + watch (http://localhost:8080); drafts visible
npm run build    # production build to _site/ (Pagefind runs on eleventy.after)
npm run clean    # rm -rf _site
```

Node ≥ 22. Eleventy is pinned to `4.0.0-alpha.10` (matches `@awesome.me/buildawesome`).

## Content model — FLAT FILES

Every post, page and draft is a **single Markdown file**. The **filename** is the
slug and the URL.

```
src/content/posts/<slug>.md      # a post   → /<slug>/
src/content/pages/<slug>.md      # a page   → /<slug>/
src/_drafts/<slug>.md            # a draft  (same shape as a post)
```

- `src/posts/` and `src/pages/` **do not exist**. Do not recreate them, and do
  not write a post as `YYYY-MM-DD-slug.md` — the date lives in front matter.
- The directory data sets `permalink: /{{ page.fileSlug }}/`; `page.fileSlug` now
  resolves off the **filename**.
- **There are no per-post `images/` directories.** They used to exist (as page
  bundles, `<slug>/index.md` + `<slug>/images/`) and are **gone**: every image in
  them was a byte-identical duplicate of a file already in `src/assets/images/`.
  Do not reintroduce them — bundle images would not be passthrough-copied anyway
  (only `src/assets` and `src/public` are), so they would 404.
- **All images live in `src/assets/images/`** and are served at
  `/assets/images/`. See [Images](#images).

### Post front matter

```yaml
---
title: "An Exorcism, Junipero Serra, and the Papal Bulls"
description: ""                      # meta description; blank = fall back (see below)
date: 2020-10-22
tags: ["inter-caetera", "kumeyaay-nation"]
categories: ["Domination Code"]      # optional, carried over from WordPress
image: "Tecumseh02.webp"             # optional — BARE FILENAME, never a path
authors: adam-brett                  # optional — defaults to steven-newcomb
---
```

Front-matter string values use **curly quotes** (`“ ”`) for any interior quote:

```yaml
title: "The 1977 UN Conference On “Indigenous Populations”"   # not \"…\"
```

Backslash-escaped straight quotes parse, but they are error-prone and leak into
titles; none remain in the repo. Do not reintroduce them.

### `description` — the meta description

Every post and page carries a `description` key, and **almost all of them are
empty (`description: ""`)** — an intentional placeholder, filled in over time.

`partials/head.njk` computes one `pageDesc` and feeds it to `<meta
name="description">`, `og:description`, `twitter:description` and the JSON-LD:

```
description  →  custom_excerpt  →  excerpt  →  metadata.description
```

An empty string is **falsy in Nunjucks**, so a blank `description` simply falls
through to the next value — which is why adding the key to all 66 files changed
no output. Fill it in to override.

### `image` → `feature_image` mapping

The theme templates (`_includes/layouts/post.njk`, `partials/feature-image.njk`,
`partials/loop-grid.njk`) all read Ghost's **`feature_image`**, and they expect a
**resolvable URL**. This site's content instead carries **`image`, a bare
filename** naming a file in `src/assets/images/`. The bridge lives in
`src/content/posts/posts.11tydata.js` (and `pages.11tydata.js`) as an
`eleventyComputed`:

```
image: "Tecumseh02.webp"   →   feature_image: "/assets/images/Tecumseh02.webp"
```

i.e. `feature_image = "/assets/images/" + image`. Rules:

- Never put a leading `/` or a directory into `image` — the prefix is added for
  you, so a path would double-prefix.
- An `image` value must name a file that actually exists in
  `src/assets/images/`, extension included (almost always `.webp`).
- An explicit `feature_image` in front matter **wins** over the computed value, so
  a new post can just use the Headline convention directly.
- `feature_image_alt` falls back to `title` in the same directory data.
- Templates keep reading `feature_image`; **do not rename the front-matter key in
  the templates** — map into it instead.

### Optional Headline fields still honored

`custom_excerpt`, `feature_image_alt`, `feature_image_caption`, `authors`,
`template` (`post` | `wide-feature-image` | `full-feature-image`) and, on pages,
`show_title_and_feature_image` are all still consumed by the templates, so they
remain valid front matter and stay in `.pages.yml`. None of the migrated posts
set them; with no `custom_excerpt`, cards fall back to `content | excerpt(40)`.

### Drafts

`published: false` front matter, or a file in `src/_drafts/` (its directory data
`_drafts.11tydata.js` defaults `published` to false and supplies the `posts` tag,
layout and permalink). A build-mode preprocessor in `eleventy.config.js` drops
drafts from production; they render in `--serve`. Promote a draft by moving the
`.md` file into `src/content/posts/`, or by setting `published: true` in place.

## Images

**One directory, `src/assets/images/` (56 files), passthrough-copied as-is to
`/assets/images/`.** There is **no build-time image pipeline** — no
`@11ty/eleventy-img`, no `eleventyImageTransformPlugin`, no filter, no automatic
conversion step. What is on disk is what ships.

- **Add new raster images already converted to `.webp`.** Nothing will convert
  them for you. SVGs and favicons are the exception — add them in their own
  format.
- The existing rasters (jpg/jpeg/png/gif) were converted **once**, with sharp at
  quality 82, and the originals deleted; unused files were pruned at the same
  time (100 → 56). This was a one-time migration, not a repeatable step.
- **Three files are intentionally not `.webp`: `default-skin.png`,
  `default-skin.svg`, `preloader.gif`.** The vendored Ghost CSS/JS in
  `src/assets/built/` (PhotoSwipe chrome) references them **by name**. Do not
  convert, rename or delete them.
- The LCP hero preload survives, as a plain
  `<link rel="preload" as="image" href="{{ feature_image }}" fetchpriority="high">`
  in `partials/head.njk`, guarded to self-hosted (non-`http`) images. No
  generated `srcset`, no `statsSync()`.
- Removing the image pipeline took `npm run build` from **~55s to ~1s**. Do not
  reintroduce a build-time image plugin without a deliberate reason.

## Markdown pipeline

Configured in **`eleventy.config.js`** with `setLibrary("md", …)`. Three plugins
participate in Markdown rendering and TOC generation:

| plugin | what it does |
| --- | --- |
| `markdown-it-footnote` | `[^1]` refs → numbered `<sup>`; `[^1]: …` defs → `<section class="footnotes">` at the end of the post, with `↩︎` back-links |
| `markdown-it-anchor` | ids on `h2`/`h3` — **default markdown-it emits none**, so without this the TOC would have nothing to link to |
| `@uncenter/eleventy-plugin-toc` | builds a nested TOC from rendered `h2`/`h3`/`h4` elements |

`markdown-it-anchor` uses Eleventy's built-in `slugify` filter, so heading IDs
are deterministic, readable, and page-local.

### Footnotes

Use standard markdown-it syntax: `[^7]` in the text, `[^7]: citation` as its own
paragraph at the bottom. A footnote that runs to a second paragraph indents the
continuation **4 spaces**.

The WordPress export had written footnotes as anchor-link pairs —
`[\[7\]](#_ftn7)` in the body, `[\[7\]](#_ftnref7) citation` at the bottom under a
manual `**Notes**` heading — which markdown-it renders as ordinary links to
anchors that do not exist. All of them were converted. Four posts carry footnotes
(51 + 80 + 2 + 2 = 135). **Do not reintroduce the `#_ftn` form.**

### Table of contents — opt-in with `toc: true`

```yaml
---
title: "…"
toc: true      # ← renders a generated TOC of the post's h2/h3/h4 headings
---
```

The post layout applies the TOC filter only when `toc: true`, then adds an
accessible `↑` return link to each included section heading. Consequences:

- **Never hand-write a Contents list or `[[toc]]` marker** — the front-matter
  flag is the only switch.
- Only `h2`/`h3`/`h4` are listed. `h1` is the post title, rendered by the layout.
- The long essays' section titles used to be **bold paragraphs** (`[↑](#ToC)
  **Title**`) with a hand-written "Contents" list of dead `#S1`…`#Sn` links. They
  are now real `##` headings and the manual list is gone.

### WordPress `[caption]` shortcode

The export left 8 `[caption id="attachment_1234" align="…" width="…"]…[/caption]`
shortcodes across 4 posts. A **markdown-it core rule** (`wp_caption`, running
before the `inline` rule) rewrites them to:

```html
<figure class="post-figure aligncenter">
  <img src="/assets/images/…webp" alt=""><figcaption>…</figcaption>
</figure>
```

It is a markdown-it rule rather than a Nunjucks filter or an HTML transform
because the image *and* the caption text are still markdown at that point, so
links, bold and curly punctuation inside the caption are parsed normally and need
no template change. `id="attachment_…"` and `width` are **dropped** (dead database
ids; hard-coded pixel widths would fight the theme's responsive CSS); `align` is
kept as a class on the `<figure>` (`alignnone` is dropped — it is the default).

`.post-figure`, `.post-toc` and `.footnotes` are **not styled yet** — they inherit
the theme's defaults.

## Conventions

- Templating is **Nunjucks** (`@11ty/nunjucks` 4). The Eleventy `input` dir is
  `src/` (includes `src/_includes/`, data `src/_data/`, assets `src/assets/`).
  Build tooling — `eleventy.config.js`, `_config/`, `locales/` — stays at the repo
  root; `.js` config files must not live inside `src/` or Eleventy renders them.
- **Timezone**: `src/_data/metadata.yaml → timezone` (IANA) feeds the date filters
  in `_config/filters.js`, which treat front-matter dates as wall-clock in that
  zone (`keepLocalTime`) so date-only values never drift across UTC.
- Layout chain: content → `_includes/layouts/{post,page,home}.njk` →
  `_includes/layouts/default.njk` (renders `<head>`, header, footer, search modal).
- Shared partials are included with `{% include "partials/NAME.njk" %}` and
  **inherit context**; card/meta partials expect a variable named `post` (an
  Eleventy collection item, i.e. `post.data.feature_image`, not `feature_image`).
  Set it before including in a non-loop context — `post.njk` builds one by hand.
- Custom filters live in `_config/filters.js`: `t` (i18n echo via
  `locales/en.json`), `readableDate`, `htmlDateString`, `rfc3339`, `year`,
  `readingTime`, `excerpt`, `limit`/`head`/`skip`, `resolveAuthors`, `pickTopics`,
  `relatedPosts`, `publicTags`, `postingLd` (JSON-LD), and `slug` (re-added —
  removed in v4). **No image filter** — nothing in the build touches images.
- Collections (in `eleventy.config.js`): `posts` (newest-first), `categories`,
  `tags`, and `topics` (an alias of `tags`, the name the theme's home layout uses).
  See [Taxonomies](#taxonomies-categories-and-tags-are-separate).

## Gotchas

### Eleventy v4 alpha

- The `slug` filter was **removed** in v4 → re-added in `_config/filters.js`.
  `slugify` remains built-in.
- Nunjucks namespace member-assignment in `{% set ns.x = … %}` can fail to
  compile — prefer a JS filter (see `relatedPosts`).
- `eleventyComputed` still works despite the internal "buildawesome" rename.
- Config `.js` must live outside `src/` (see Conventions) — inside the input dir
  Eleventy would render it as a template.

### Authors: `siteAuthors` (objects) vs `authors` (keys)

**Two different names, on purpose.** The two halves of the byline no longer share
a key:

| where | name | shape |
| --- | --- | --- |
| `src/_data/siteAuthors.yaml` | global `siteAuthors` | the author **objects** (`key`, `name`, `bio`, …). `key` IS the URL slug |
| a post's front matter | `authors` | the post's own author **keys** (strings) |

Front matter takes a **scalar or a list**; both work:

```yaml
authors: adam-brett            # the common case
authors: [adam-brett, david-ratcliffe]
```

`resolveAuthors` (in `_config/filters.js`) normalizes either form to an array of
keys and looks each one up in the global list, which the template passes in
explicitly:

```njk
{{ post.data.authors | resolveAuthors(siteAuthors) }}
```

`posts.11tydata.js` computes `authors` down to an array of key strings and
supplies the default byline — `"steven-newcomb"` — only when the post named no
author of its own.

**Why the global is not called `authors`:** Eleventy **concatenates arrays across
data-cascade layers**. When the global data file was `authors.yaml`, its objects
and the post's key strings landed on the *same* key, and every post saw a mixed
`[...objects, ...keys]` array that `resolveAuthors` had to pick apart. That also
made a bare `authors: adam-brett` (a scalar, which **replaces** rather than
concatenates) wipe out the object list and blank every byline. The rename removes
the collision. **Do not name a global data file `authors.yaml` again.**

Still true, and still **silent** — no error, no build failure:

- Do **not** declare `authors: ["steven-newcomb"]` as plain directory data instead
  of computing it. It would concatenate with the front matter, so every post by
  Adam or David would get a **double byline** (Steven *and* the real author). Keep
  the default in `eleventyComputed`, which replaces.

55 posts are Steven's (the default); 2 are Adam's and carry `authors: adam-brett`.
David Ratcliffe wrote none — he only uploaded images — so `/author/david-ratcliffe/`
builds but is empty.

The concatenate-don't-replace behaviour still shapes the `tags` computed value
right below `authors`, which only dedupes: it spreads `data.tags` back in, because
dropping it would unhook every post from the `posts` collection.

### Taxonomies: `categories` and `tags` are separate

Two independent archives, `/category/<slug>/` (`src/categories.njk`) and
`/tag/<slug>/` (`src/tags.njk`). 12 public categories, 99 public tags.

`categories` used to be **folded into `tags`** by `posts.11tydata.js`, so a
category's archive was really a tag archive and `/category/<x>/` was a redirect.
That is gone. Do not reintroduce the fold — it would collide the two namespaces
(`american-dream` and `featured` are the only names that exist in both).

Both taxonomies, and the newest-first `posts` list, are built in **one pass** over
the posts in `eleventy.config.js` (`taxonomies()`, memoized per run and cleared on
`eleventy.before`). Each term is `{ name, slug, count, posts }`:

- posts are sorted **once**, before the loop, so every `term.posts` is already
  newest-first;
- each term is slugged **once**, at collection-build time, not per render;
- **templates never re-filter.** They iterate `term.posts`. The old
  `collections.posts | byTag(term.name)` inside the archive template was
  O(terms × posts) per build — that is why `byTag` no longer exists.

`collections.topics` is the **same array as `collections.tags`** (the theme's home
layout calls tags "topics"). `theme.primary_section_tags` / `secondary_section_tags`
hold tag NAMES; `home.njk` resolves them to term objects with the `pickTopics`
filter, so `topic-grid.njk` / `topic-minimal.njk` always get a term that carries its
own posts.

`featured`, `posts`, `all` and `page` are **internal terms** (`INTERNAL_TERMS` in
`eleventy.config.js`): excluded from both taxonomies, so neither `/tag/featured/`
nor `/category/featured/` is ever built. `_redirects.json` must never point at one.

### darkmode.css is inlined into head.njk

`src/_includes/partials/head.njk` contains an **inlined copy** of
`src/assets/css/darkmode.css` (and `fonts.css`) to avoid two render-blocking
requests. **Editing `src/assets/css/darkmode.css` alone does nothing** — you must
re-sync the copy inside `head.njk`. The file says so at the top of the block.

## Features to keep working

- **Pagefind** search: `head.njk` loads the Component UI; `data-pagefind-body`
  on post/page `<article>` scopes the index.
- **Light/dark**: no-flash script in `head.njk`, `assets/css/darkmode.css`
  (inlined — see above), `assets/js/theme-toggle.js`, default in `_data/theme.yaml`.
- **Pages CMS**: `.pages.yml` field paths must track `src/_data/*` and
  `src/content/*` — now flat `.md` files, which Pages CMS handles natively (the
  old directory-bundle limitation no longer applies).
- **Fast builds**: `npm run build` is ~1s. If it creeps back toward a minute,
  something has reintroduced an image pipeline.

## Boundaries

- Do not commit `node_modules/`, `_site/`, or secrets.
- Assets under `assets/built/` are the original theme's compiled CSS/JS — treat as
  vendored; add new styles in `assets/css/darkmode.css` or a new file.
- `CLAUDE.md` is a **symlink** to this file. Edit `AGENTS.md`; never replace the
  symlink with a copy.
