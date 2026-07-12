# originalfreenations.com

**Original Free Nations** — cutting-edge research for Indigenous Peoples'
liberation. A static site built with [Eleventy](https://www.11ty.dev/) v4 and
Nunjucks, using the **11ty-Headline** theme.

The site was migrated off WordPress. `originalfreenations.WordPress.2026-07-08.xml`
is the original WordPress export and is kept in the repo as the **migration
source of truth** — if a post's body, date, tags or images look wrong, that file
is the thing to check against. Do not delete it.

## CHANGELOG
## ELEMENTS NEEDED
1. under the navbar make the homepage layout match <headline.ghost>
2. make the footer match <headline.ghost.io>
3. add the following to the 'gh-subscribe' class
```
<iframe src="https://stevennewcomb.substack.com/embed" width="480" height="320" style="border:1px solid #EEE; background:white;" frameborder="0" scrolling="no"></iframe>
```
4. to the header set subscribe button to go to: <https://stevennewcomb.substack.com/>
5. next to subscribe in a complimentary button add a button labeled `listen now` and link to <https://redcircle.com/show/2caa5839-9deb-419c-9347-2458812d9406?utm_source=embedded-player&utm_medium=widget&utm_campaign=embed-backlink>
6. in the footer add a button with a link labeled `buy the book` <https://www.chicagoreviewpress.com/pagans-in-the-promised-land-products-9781555916428.php>
7. add row of social media icons in the footer including <https://www.facebook.com/steventnewcomb> use phosphor icons <https://phosphoricons.com/?q=facebook>
8. check that theme adapation is rather literal except for the additioanl buttons we added and light/darkmode



## Stack

- **[@11ty/eleventy](https://www.11ty.dev/) `4.0.0-alpha.10`** (the "Build
  Awesome" v4 line) with the bundled **`@11ty/nunjucks` 4** templating engine.
  Note this is a **prerelease** — see `AGENTS.md` for the v4 alpha gotchas.
- **[11ty-Headline](https://github.com/adamdjbrett/11ty-Headline)** — the theme.
  Ghost's "Headline" news theme, converted from Handlebars to Nunjucks.
- **No build-time image pipeline.** Images are **pre-converted to `.webp`** and
  served as-is by passthrough copy from `src/assets/images/` — see
  [Images](#images). (`@11ty/eleventy-img` / `eleventyImageTransformPlugin` used
  to run over every `<img>`; the site no longer ships either one. Dropping them
  took `npm run build` from **~55s to ~1s**.)
- **[Pagefind](https://pagefind.app/)** — indexes `_site` after a production
  build and provides the modal Component UI (⌘/Ctrl + K).
- **[Pages CMS](https://pagescms.org/)** — browser-based editing via `.pages.yml`.

## Commands

```bash
npm install
npm run dev      # dev server + watch at http://localhost:8080 (drafts visible)
npm run build    # production build to _site/ (drafts dropped, Pagefind runs)
npm run clean    # rm -rf _site
```

Node ≥ 22.

## Content model — flat files

Every post, page and draft is a **single Markdown file**. The filename is the
slug and the URL.

```
src/content/posts/<slug>.md      # a post; the URL is /<slug>/
src/content/pages/<slug>.md      # a standalone page → /<slug>/
src/_drafts/<slug>.md            # a draft (same shape as a post)
```

There is no `src/posts/` or `src/pages/`, and posts have **no per-post `images/`
directory** — all images live in one place, `src/assets/images/` (see below).
The permalink in the directory data is `/{{ page.fileSlug }}/`, which now
resolves off the filename.

### Post front matter

```yaml
---
title: "An Exorcism, Junipero Serra, and the Papal Bulls"
description: ""        # meta description; blank falls back to the site default
date: 2020-10-22
tags:
  - "inter-caetera"
  - "kumeyaay-nation"
categories:            # optional
  - "Domination Code"
image: "Tecumseh02.webp"   # optional — BARE FILENAME, not a path
authors: adam-brett        # optional — defaults to steven-newcomb
---
```

- **`tags`** drive the topic archives (`/tag/<slug>/`) and the homepage topic
  sections (`src/_data/theme.yaml` picks which tags are featured).
- **`categories`** is optional and carried over from WordPress.
- **`description`** is the meta description. It is present but **empty** on every
  post and page; a blank value falls back to `custom_excerpt`, then an excerpt,
  then the site description in `src/_data/metadata.yaml`.
- **`image` is a bare filename, not a path.** It names a file in
  `src/assets/images/`. `src/content/posts/posts.11tydata.js` (and
  `pages.11tydata.js`) maps it to the Headline `feature_image` URL the templates
  expect:

  ```
  image: "Tecumseh02.webp"  →  feature_image: /assets/images/Tecumseh02.webp
  ```

  Never write a leading `/` or a directory into `image` — it would double-prefix.
  An explicit `feature_image` in front matter overrides the computed value.
- **`authors`** takes an author `key` from `src/_data/siteAuthors.yaml`, as a
  scalar (`authors: adam-brett`) or a list. It defaults to `steven-newcomb`.

Headline's own optional fields (`custom_excerpt`, `feature_image_alt`,
`feature_image_caption`, `authors`, `template`) are still read by the templates
and may be added to any post; none of the migrated posts set them, so excerpts
fall back to the first ~40 words of the body.

## Images

All images live in **`src/assets/images/`** (56 files) and are **passthrough-copied
as-is** to `/assets/images/`. There is no build-time image plugin and no
automatic conversion step, so:

> **Add new raster images already converted to `.webp`.** (SVGs and favicons are
> the exception — add them in their own format.)

The raster images (jpg/jpeg/png/gif) were converted **once**, with sharp at
quality 82, and the originals deleted; unused images were pruned at the same
time (100 files → 56). Three files are deliberately **not** `.webp`:
`default-skin.png`, `default-skin.svg` and `preloader.gif` are theme chrome
referenced by name from the vendored Ghost CSS/JS in `src/assets/built/` — do
not rename, convert or delete them.

The LCP hero image still gets a preload, but it is now a plain
`<link rel="preload" as="image" href="{{ feature_image }}">` in
`_includes/partials/head.njk` — no generated `srcset`.

### Drafts

Anything in `src/_drafts/` is a draft (its directory data defaults `published`
to `false`), as is any post with `published: false`. Drafts render in
`npm run dev` and are stripped from `npm run build`. Promote one by moving the
file into `src/content/posts/` (or setting `published: true`).

## Where things live

```
src/                   # Eleventy input dir
  content/posts/       # posts, one flat .md per post  → /<slug>/
  content/pages/       # pages, one flat .md per page  → /<slug>/
  _drafts/             # drafts, one flat .md each (dev only)
  index.md             # homepage (layout: home.njk)
  latest.njk           # paginated archive  → /latest/
  authors.njk          # per-author archive → /author/<slug>/
  tags.njk             # per-topic archive  → /tag/<slug>/
  search.njk           # Pagefind search page → /search/
  _includes/layouts/   # default, post, page, home
  _includes/partials/  # cards, meta, head, search, theme toggle, icons
  _data/               # metadata, navigation, theme, authors (Pages CMS editable)
  assets/              # theme CSS/JS/fonts + images/ (all site images, .webp)
  public/              # copied to the site root as-is
eleventy.config.js     # input=src; collections, drafts preprocessor, Pagefind hook
_config/filters.js     # t (i18n), dates (timezone-aware), reading time, slug, …
locales/en.json        # i18n strings for the `t` filter
.pages.yml             # Pages CMS schema
originalfreenations.WordPress.2026-07-08.xml   # WordPress export — migration source of truth
```

### Routes

| URL | Source |
| --- | --- |
| `/` | `src/index.md` (homepage: featured + topic sections) |
| `/<slug>/` | a post (`src/content/posts/<slug>.md`) or page (`src/content/pages/<slug>.md`) |
| `/latest/` | `src/latest.njk` — paginated archive of all posts |
| `/news/` | `src/content/pages/news.md` — reverse-chronological listing of every post |
| `/tag/<slug>/` | `src/tags.njk` — per-topic archive |
| `/author/<slug>/` | `src/authors.njk` — per-author archive |
| `/search/` | `src/search.njk` — Pagefind |
| `/feed/` | Atom feed |
| `/assets/images/…` | passthrough copy of `src/assets/images/` |

Build tooling stays at the repo root: config `.js` files must live **outside**
`src/` or Eleventy treats them as templates.

## Credits

- **[Headline](https://github.com/TryGhost/Themes)** — the original theme, by the
  **Ghost Foundation** (MIT).
- **Eleventy conversion** ([11ty-Headline](https://github.com/adamdjbrett/11ty-Headline))
  by **Adam DJ Brett**.
- **[Phosphor Icons](https://phosphoricons.com/)** — search and light/dark toggle
  icons, by Helena Zhang and Tobias Fried.

## License

[MIT](LICENSE). Headline is © 2013–2026 Ghost Foundation. Site content © Original
Free Nations.
