import { execFileSync } from "node:child_process";
import yaml from "js-yaml";
import pluginFilters from "./_config/filters.js";
import markdownIt from "markdown-it";
import markdownItAnchor from 'markdown-it-anchor';
import markdownItFootnote from "markdown-it-footnote";
import pluginTOC from '@uncenter/eleventy-plugin-toc';

const INTERNAL_TERMS = new Set(["posts", "all", "featured", "page"]);

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default async function (eleventyConfig) {
	// ---------------------------------------------------------------------------
	// Data formats
	// ---------------------------------------------------------------------------
	eleventyConfig.addDataExtension("yaml", (contents) => yaml.load(contents));

	// Drafts: a post is a draft when `published: false` (or it lives in
	// src/_drafts/, whose directory data defaults published to false). Drafts
	// are excluded from production builds but render in --serve for preview.
	eleventyConfig.addPreprocessor("drafts", "*", (data) => {
		if (data.published === false && process.env.ELEVENTY_RUN_MODE === "build") {
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

	// ---------------------------------------------------------------------------
	// Filters & shortcodes (t, dates, reading time, image helpers, …)
	// ---------------------------------------------------------------------------
	eleventyConfig.addPlugin(pluginFilters);

	eleventyConfig.addPlugin(pluginTOC, {
		tags: ["h2", "h3", "h4"],
		wrapper: (items) =>
			`<nav id="toc" class="post-toc" aria-labelledby="toc-title"><h2 id="toc-title">Contents</h2>${items}</nav>`,
	});

eleventyConfig.setLibrary("md", markdownIt({
    html: true,
    linkify: true,
    typographer: true
})
.use(markdownItFootnote)
.use(markdownItAnchor, {
    level: [2, 3, 4],
	slugify: (str) => eleventyConfig.getFilter("slugify")(str),
}));


	// ---------------------------------------------------------------------------
	// Collections
	// ---------------------------------------------------------------------------
	let taxonomyCache;
	const taxonomies = (api) => {
		if (taxonomyCache) return taxonomyCache;
		const posts = api.getFilteredByTag("posts").sort((a, b) => b.date - a.date);
		const buildTerms = (field) => {
			const terms = new Map();
			for (const post of posts) {
				for (const name of post.data[field] || []) {
					if (INTERNAL_TERMS.has(name)) continue;
					const key = String(name).toLowerCase();
					if (!terms.has(key)) {
						terms.set(key, {
							name,
							slug: eleventyConfig.getFilter("slugify")(String(name)),
							posts: [],
						});
					}
					terms.get(key).posts.push(post);
				}
			}
			return [...terms.values()]
				.map((term) => ({ ...term, count: term.posts.length }))
				.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
		};
		taxonomyCache = { posts, tags: buildTerms("tags"), categories: buildTerms("categories") };
		return taxonomyCache;
	};

	eleventyConfig.on("eleventy.before", () => { taxonomyCache = undefined; });
	eleventyConfig.addCollection("posts", (api) => taxonomies(api).posts);
	eleventyConfig.addCollection("tags", (api) => taxonomies(api).tags);
	eleventyConfig.addCollection("topics", (api) => taxonomies(api).tags);
	eleventyConfig.addCollection("categories", (api) => taxonomies(api).categories);

  

	// ---------------------------------------------------------------------------
	// Pagefind — build-only: index the site after production builds
	// (ELEVENTY_RUN_MODE === "build"); skipped in --serve/--watch for fast dev.
	// Produces /pagefind/* consumed by the Component UI (<pagefind-modal>).
	// ---------------------------------------------------------------------------
	eleventyConfig.on("eleventy.after", ({ dir }) => {
		if (process.env.ELEVENTY_RUN_MODE === "build") {
			try {
				execFileSync("./node_modules/.bin/pagefind", ["--site", dir.output, "--glob", "**/*.html"], {
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
