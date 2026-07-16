import { execSync } from "node:child_process";
import yaml from "js-yaml";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import pluginFilters from "./_config/filters.js";
import markdownIt from "markdown-it";
import markdownItAttrs from 'markdown-it-attrs';
import markdownItAnchor from 'markdown-it-anchor';
import markdownItFootnote from "markdown-it-footnote";
import slugify from "slugify";
import pluginTOC from '@uncenter/eleventy-plugin-toc';

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

	// ---------------------------------------------------------------------------
	// Images — optimize every local <img> in the built HTML to AVIF/WebP with
	// a responsive srcset + explicit width/height (kills CLS and "properly
	// size images" / "next-gen formats" Lighthouse failures). Feature images
	// are self-hosted under /assets/images/ so builds are network-free and
	// reproducible. Per-image loading/fetchpriority/sizes come from the tags.
	// ---------------------------------------------------------------------------
	eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
		extensions: "html",
		formats: ["avif", "webp", "auto"],
		widths: ["auto", 300, 600, 960, 1200, 2000],
		sharpOptions: { animated: false },
		sharpAvifOptions: { quality: 55 },
		sharpWebpOptions: { quality: 66 },
		sharpJpegOptions: { quality: 72, mozjpeg: true },
		defaultAttributes: {
			loading: "lazy",
			decoding: "async",
			sizes: "(max-width: 1200px) 100vw, 1200px",
		},
		urlPath: "/assets/images/optimized/",
		outputDir: "./_site/assets/images/optimized/",
	});

	eleventyConfig.addPlugin(pluginTOC, {
        tags: ['h2', 'h3', 'h4'],
        wrapper: function(toc) {
            return `<nav class="toc">${toc}</nav>`;
        }
    });

	 eleventyConfig.addFilter("slug", function(str, options = {}) {
        if (!str) return "";
        options.lower ??= true;
        return slugify("" + str, options);
    });

eleventyConfig.setLibrary("md", markdownIt({
    html: true,
    linkify: true,
    typographer: true
})
.use(markdownItFootnote)
.use(markdownItAnchor, {
    level: [2, 3, 4],
    slugify: function(str) {
        if (typeof this._headingCounter === 'undefined') {
            this._headingCounter = 0;
        }
        this._headingCounter++;
        return `S${this._headingCounter}`;
    }
}));


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

	eleventyConfig.addFilter("findTopicByName", function(topics, name) {
	if (!topics || !name) return null;
	return topics.find(t => t.name.toLowerCase() === name.toLowerCase());
});
	
	  eleventyConfig.addFilter("byTag", function(posts, tagName) {
    if (!posts || !tagName) return [];
    return posts.filter(post => {
      const tags = post.data.tags || [];
      return tags.some(tag => tag.toLowerCase() === tagName.toLowerCase());
    });
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
