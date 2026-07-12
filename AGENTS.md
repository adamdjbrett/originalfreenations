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
date: 2020-10-22
tags: ["inter-caetera", "kumeyaay-nation"]
categories: ["Domination Code"]      # optional, carried over from WordPress
coverImage: "Tecumseh02.webp"        # optional — BARE FILENAME, never a path
---
```

### coverImage → feature_image mapping

The theme templates (`_includes/layouts/post.njk`, `partials/feature-image.njk`,
`partials/loop-grid.njk`) all read Ghost's **`feature_image`**, and they expect a
**resolvable URL**. This site's content instead carries **`coverImage`, a bare
filename** naming a file in `src/assets/images/`. The bridge lives in
`src/content/posts/posts.11tydata.js` (and `pages.11tydata.js`) as an
`eleventyComputed`:

```
coverImage: "Tecumseh02.webp"   →   feature_image: "/assets/images/Tecumseh02.webp"
```

i.e. `feature_image = "/assets/images/" + coverImage`. Rules:

- Never put a leading `/` or a directory into `coverImage` — the prefix is added
  for you, so a path would double-prefix.
- A `coverImage` value must name a file that actually exists in
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
  `readingTime`, `excerpt`, `limit`/`head`/`skip`, `resolveAuthors`, `byTag`,
  `relatedPosts`, `publicTags`, `postingLd` (JSON-LD), and `slug` (re-added —
  removed in v4). **No image filter** — nothing in the build touches images.
- Collections (in `eleventy.config.js`): `posts` (newest-first) and `topics`
  (`[{name, count}]` public tags by count).

## Gotchas

### Eleventy v4 alpha

- The `slug` filter was **removed** in v4 → re-added in `_config/filters.js`.
  `slugify` remains built-in.
- Nunjucks namespace member-assignment in `{% set ns.x = … %}` can fail to
  compile — prefer a JS filter (see `relatedPosts`).
- `eleventyComputed` still works despite the internal "buildawesome" rename.
- Config `.js` must live outside `src/` (see Conventions) — inside the input dir
  Eleventy would render it as a template.

### `authors` is an overloaded key — keep the objects in the array

`src/_data/authors.yaml` puts author **objects** on the `authors` key globally,
while a post's front matter puts author **keys** (strings) on it. Eleventy
**concatenates arrays across data-cascade layers**, so the raw value a post sees is:

```
[...author objects from authors.yaml, ...string keys from front matter]
```

`resolveAuthors` (in `_config/filters.js`) depends on exactly that mixed shape —
it matches the key strings against the objects sitting in the same array. So any
change to `authors` must **preserve the objects**.

`posts.11tydata.js` supplies the default byline in `eleventyComputed`, keeping the
objects and adding `"steven-newcomb"` only when the post named no author of its own:

```js
authors: (data) => {
  const merged = Array.isArray(data.authors) ? data.authors : [];
  const objects = merged.filter((a) => a && typeof a === "object");
  const keys = merged.filter((a) => typeof a === "string" && a.trim());
  return [...objects, ...(keys.length ? keys : ["steven-newcomb"])];
},
```

Two ways to break this, both **silent** — no error, no build failure:

- **Declaring** `authors: ["steven-newcomb"]` as plain directory data instead. It
  concatenates with the front matter, so every post by Adam or David gets a
  **double byline** (Steven *and* the real author).
- **Computing** it without spreading the objects back in. The object list vanishes,
  `resolveAuthors` matches nothing, and **every byline on the site blanks out**.

55 posts are Steven's (default); 2 are Adam's and carry an explicit
`authors: ["adam-brett"]`. David Ratcliffe wrote none — he only uploaded images —
so `/author/david-ratcliffe/` builds but is empty.

The same concatenate-don't-replace trap applies to the `tags` computed value right
below it, which folds WordPress `categories` into `tags`: it spreads `data.tags`
back in, because dropping it would unhook every post from the `posts` collection.

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
