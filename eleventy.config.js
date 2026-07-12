import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import JSON5 from "json5";
import yaml from "js-yaml";
import pluginFilters from "./_config/filters.js";

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
	// Collections
	// ---------------------------------------------------------------------------
	// All published posts, newest first.
	eleventyConfig.addCollection("posts", (api) =>
		api.getFilteredByTag("posts").sort((a, b) => b.date - a.date),
	);

	// Unique post tags (excluding internal tags) with their post counts,
	// ordered by count desc — used for the homepage topic sections.
	eleventyConfig.addCollection("topics", (api) => {
		const excluded = new Set(["posts", "all", "featured", "page"]);
		const counts = new Map();
		for (const item of api.getFilteredByTag("posts")) {
			for (const tag of item.data.tags || []) {
				if (excluded.has(tag)) continue;
				counts.set(tag, (counts.get(tag) || 0) + 1);
			}
		}
		return [...counts.entries()]
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => b.count - a.count);
	});

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
