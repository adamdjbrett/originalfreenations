import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import JSON5 from "json5";
import yaml from "js-yaml";
import pluginFilters from "./_config/filters.js";
import pluginMarkdown from "./_config/markdown.js";

/**
 * Emit the redirect map into the built site.
 *
 * `_redirects.json` (JSON5) at the repo root is the single source of truth. It is
 * PARSED here rather than blindly copied, so a syntax error fails the build loudly
 * instead of silently shipping a site with no redirects — the exact failure mode
 * xmit's docs warn about ("the redirects just silently won't do anything").
 *
 * Two files are written to the site root:
 *   _redirects.json — the source map, verbatim
 *   xmit.toml       — generated, because xmit's documented redirect format is TOML
 *                     ([[redirects]] with a regex `from`, a `to` supporting $1
 *                     capture groups, and `permanent`). Generating it from the JSON5
 *                     keeps one authoring format and one source of truth.
 */
function emitRedirects(outputDir) {
	const src = readFileSync("_redirects.json", "utf8");
	const { redirects } = JSON5.parse(src); // throws on malformed input -> build fails

	if (!Array.isArray(redirects) || redirects.length === 0) {
		throw new Error("[redirects] _redirects.json parsed but contains no rules");
	}
	for (const [i, r] of redirects.entries()) {
		if (!r.from || !r.to) {
			throw new Error(`[redirects] rule ${i} is missing \`from\` or \`to\``);
		}
		new RegExp(r.from); // throws on an invalid pattern -> build fails
	}

	const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
	const toml = [
		"# GENERATED — do not edit. Source of truth: _redirects.json (JSON5).",
		"# Regenerated on every `npm run build` by eleventy.config.js.",
		"",
		...redirects.flatMap((r) => [
			"[[redirects]]",
			`from = "${esc(r.from)}"`,
			`to = "${esc(r.to)}"`,
			...(r.permanent ? ["permanent = true"] : []),
			"",
		]),
	].join("\n");

	writeFileSync(`${outputDir}/_redirects.json`, src);
	writeFileSync(`${outputDir}/xmit.toml`, toml);
	console.log(`[redirects] wrote ${redirects.length} rules to _redirects.json + xmit.toml`);
}

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default async function (eleventyConfig) {
	// ---------------------------------------------------------------------------
	// Data formats
	// ---------------------------------------------------------------------------
	eleventyConfig.addDataExtension("yaml", (contents) => yaml.load(contents));

	// Drafts are never written — not in `build`, not in `--serve`. Two rules,
	// either one alone is enough to withhold a page:
	//
	//   1. `published: false` in front matter (or inherited from directory data)
	//   2. the file lives under src/_drafts/
	//
	// Rule 2 is checked against inputPath rather than leaning on the `published`
	// flag, so a stray `published: true` inside src/_drafts/ cannot leak a draft
	// onto the site. To publish a draft, MOVE it into src/content/posts/.
	eleventyConfig.addPreprocessor("drafts", "*", (data) => {
		const inDraftsDir = (data.page?.inputPath || "").includes("/_drafts/");
		if (data.published === false || inDraftsDir) {
			return false;
		}
	});

	// ---------------------------------------------------------------------------
	// Passthrough copy — keep the original Ghost theme assets (css/js/fonts)
	// ---------------------------------------------------------------------------
	eleventyConfig.addPassthroughCopy({ "./src/assets": "/assets" });
	eleventyConfig.addPassthroughCopy({ "./src/public": "/" });

	eleventyConfig.addWatchTarget("src/assets/css/**/*.css");
	eleventyConfig.addWatchTarget("src/assets/js/**/*.js");
	eleventyConfig.addWatchTarget("_redirects.json");

	// ---------------------------------------------------------------------------
	// Filters & shortcodes (t, dates, reading time, image helpers, …)
	// ---------------------------------------------------------------------------
	eleventyConfig.addPlugin(pluginFilters);

	// ---------------------------------------------------------------------------
	// Markdown pipeline — footnotes, opt-in TOC (`toc: true`), [caption] shortcode
	// ---------------------------------------------------------------------------
	eleventyConfig.addPlugin(pluginMarkdown);

	// ---------------------------------------------------------------------------
	// Collections — TWO INDEPENDENT TAXONOMIES, BUILT IN ONE PASS
	// ---------------------------------------------------------------------------
	// `tags` and `categories` are separate archives (/tag/<slug>/ and
	// /category/<slug>/). Both, plus the sorted `posts` list they are derived from,
	// come out of a SINGLE iteration over the posts, memoized for the run:
	//
	//   * posts are sorted newest-first ONCE, before the loop, so every term's
	//     `posts` array is already newest-first — no per-term sort.
	//   * each term is slugged ONCE here, not on every template render.
	//   * each term CARRIES ITS OWN POSTS, so an archive template just iterates
	//     `term.posts`. Nothing re-scans the post list per page (the old
	//     `collections.posts | byTag(name)` inside tags.njk was O(terms x posts)).
	//
	// Term shape: { name, slug, count, posts }.
	//
	// `featured` is an internal editorial flag, not a public archive term; `posts`,
	// `all` and `page` are Eleventy/theme plumbing. None of them get an archive.
	const INTERNAL_TERMS = new Set(["posts", "all", "featured", "page"]);

	let taxonomyCache = null;
	eleventyConfig.on("eleventy.before", () => {
		taxonomyCache = null; // content changed (or --watch re-ran) — recompute
	});

	function taxonomies(api) {
		if (taxonomyCache) return taxonomyCache;

		const slugify = eleventyConfig.getFilter("slugify");
		const posts = api.getFilteredByTag("posts").sort((a, b) => b.date - a.date);
		const categories = new Map();
		const tags = new Map();

		const collect = (map, names, post) => {
			for (const name of names || []) {
				if (INTERNAL_TERMS.has(name)) continue;
				let term = map.get(name);
				if (!term) {
					term = { name, slug: slugify(name), count: 0, posts: [] };
					map.set(name, term);
				}
				term.posts.push(post); // `posts` is pre-sorted -> so is this
				term.count = term.posts.length;
			}
		};

		for (const post of posts) {
			collect(categories, post.data.categories, post);
			collect(tags, post.data.tags, post);
		}

		// Busiest term first, ties broken alphabetically for a stable build.
		const byCount = (map) =>
			[...map.values()].sort(
				(a, b) => b.count - a.count || a.name.localeCompare(b.name),
			);

		taxonomyCache = {
			posts,
			categories: byCount(categories),
			tags: byCount(tags),
		};
		return taxonomyCache;
	}

	// All published posts, newest first.
	eleventyConfig.addCollection("posts", (api) => taxonomies(api).posts);

	// /category/<slug>/ — src/categories.njk paginates this.
	eleventyConfig.addCollection("categories", (api) => taxonomies(api).categories);

	// /tag/<slug>/ — src/tags.njk paginates this.
	eleventyConfig.addCollection("tags", (api) => taxonomies(api).tags);

	// `topics` = the TAG taxonomy under its theme-facing name (home.njk's topic
	// sections). Same array, same objects as `collections.tags` — the single pass
	// above is not repeated.
	eleventyConfig.addCollection("topics", (api) => taxonomies(api).tags);

	// ---------------------------------------------------------------------------
	// Redirects — emitted on EVERY run (build and --serve), so a broken
	// _redirects.json surfaces in dev rather than at deploy time.
	// ---------------------------------------------------------------------------
	eleventyConfig.on("eleventy.after", ({ dir }) => {
		emitRedirects(dir.output);
	});

	// ---------------------------------------------------------------------------
	// Pagefind — build-only: index the site after production builds
	// (ELEVENTY_RUN_MODE === "build"); skipped in --serve/--watch for fast dev.
	// Produces /pagefind/* consumed by the Component UI (<pagefind-modal>).
	// ---------------------------------------------------------------------------
	eleventyConfig.on("eleventy.after", ({ dir }) => {
		if (process.env.ELEVENTY_RUN_MODE === "build") {
			try {
				execSync(`npx -y pagefind --site "${dir.output}" --glob "**/*.html"`, {
					encoding: "utf-8",
					stdio: "inherit",
				});
			} catch (error) {
				console.warn("[pagefind] indexing skipped:", error.message);
			}
		}
	});

	// ---------------------------------------------------------------------------
	// Optional: @apleasantview/eleventy-plugin-baseline
	// Enabled when installed; safe no-op if it is not (baseline is optional).
	// ---------------------------------------------------------------------------
	if (process.env.USE_BASELINE) {
		try {
			const { default: baseline } = await import(
				"@apleasantview/eleventy-plugin-baseline"
			);
			eleventyConfig.addPlugin(baseline);
		} catch (error) {
			console.warn("[baseline] plugin not loaded:", error.message);
		}
	}
}

export const config = {
	templateFormats: ["md", "njk", "html", "11ty.js"],
	markdownTemplateEngine: "njk",
	htmlTemplateEngine: "njk",
	dir: {
		input: "src",
		includes: "_includes",
		data: "_data",
		output: "_site",
	},
};
