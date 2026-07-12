import markdownItAnchor from "markdown-it-anchor";
import markdownItFootnote from "markdown-it-footnote";
import markdownItToc from "markdown-it-table-of-contents";

/**
 * The markdown pipeline.
 *
 * Eleventy's built-in markdown-it instance is AMENDED (not replaced with
 * `setLibrary`), so every default Eleventy sets — `html: true` above all, which
 * the migrated WordPress content leans on — stays exactly as it was. This file
 * only ADDS to it.
 *
 * Three things live here:
 *
 *   1. footnotes   — markdown-it-footnote. Content uses standard `[^1]` /
 *                    `[^1]: …` syntax (converted from WordPress's `#_ftn1`
 *                    anchor-link footnotes during the migration).
 *   2. TOC         — markdown-it-table-of-contents + markdown-it-anchor. Opt-in
 *                    per post with `toc: true` in front matter; see the
 *                    preprocessor at the bottom.
 *   3. [caption]   — the leftover WordPress `[caption]` shortcode, rewritten to
 *                    <figure>/<figcaption> as a markdown-it core rule.
 */

// -----------------------------------------------------------------------------
// Slugify — ONE implementation, shared by markdown-it-anchor (which writes the
// heading ids) and markdown-it-table-of-contents (which writes the links to
// them). If these two ever disagree, every TOC link 404s inside the page.
//
// Footnote markers are stripped first: one heading in the essays carries a
// trailing `[^17]`, and we do not want "17" in its id.
// -----------------------------------------------------------------------------
function slugify(str) {
	return String(str)
		.replace(/\[\^\d+\]/g, "")
		.trim()
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "") // strip combining accents
		.replace(/['‘’“”]/g, "") // quotes/apostrophes: drop, don't hyphenate
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

// -----------------------------------------------------------------------------
// WordPress [caption] shortcode -> <figure><img><figcaption>
//
// The 8 surviving occurrences all look like (brackets backslash-escaped by the
// WordPress -> markdown migration):
//
//   \[caption id="attachment\_3073" align="aligncenter" width="900"\]
//     ![](/assets/images/x.webp)                 <- or [![](…)](https://link)
//     caption text, which may contain **bold** and [links](…)
//   \[/caption\]
//
// This is a markdown-it CORE rule rather than a Nunjucks filter or an HTML
// transform, for two reasons:
//
//   * it needs no template change (the post layout is owned elsewhere), and
//   * the image AND the caption text are still markdown at this point — running
//     before the `inline` rule means both are parsed normally, so links, bold
//     and the curly punctuation inside the caption survive untouched. A regex
//     over the rendered HTML could not do that, and a regex over the raw
//     markdown would have to re-implement an inline parser.
//
// WordPress cruft: `id="attachment_NNNN"` and `width` are DROPPED (the ids point
// at a database that no longer exists; the widths were the pixel size of the
// scaled-down WP image and would fight the theme's responsive CSS). `align` is
// KEPT as a class on the <figure> — `aligncenter` / `alignleft` / `alignright`
// (`alignnone` is dropped, it is the default).
// -----------------------------------------------------------------------------
const CAPTION_OPEN = /^\\?\[caption\b([^\]]*?)\\?\]\s*/;
const CAPTION_CLOSE = /\s*\\?\[\/caption\\?\]\s*$/;
// a bare image  ![alt](src)  or a linked image  [![alt](src)](href)
const LEADING_IMAGE = /^(\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)|!\[[^\]]*\]\([^)]*\))\s*/;

function wpCaption(md) {
	md.core.ruler.before("inline", "wp_caption", (state) => {
		const tokens = state.tokens;

		for (let i = 0; i < tokens.length; i++) {
			const inline = tokens[i];
			if (inline.type !== "inline") continue;
			if (tokens[i - 1]?.type !== "paragraph_open") continue;
			if (tokens[i + 1]?.type !== "paragraph_close") continue;

			const open = CAPTION_OPEN.exec(inline.content);
			if (!open || !CAPTION_CLOSE.test(inline.content)) continue;

			const attrs = open[1] || "";
			const inner = inline.content
				.replace(CAPTION_OPEN, "")
				.replace(CAPTION_CLOSE, "");

			const img = LEADING_IMAGE.exec(inner);
			const imageMd = img ? img[1] : "";
			const captionMd = (img ? inner.slice(img[0].length) : inner).trim();

			const align = /align="(align\w+)"/.exec(attrs)?.[1];
			const classes = ["post-figure"];
			if (align && align !== "alignnone") classes.push(align);

			const Token = state.Token;
			const html = (content) => {
				const t = new Token("html_block", "", 0);
				t.content = content;
				t.block = true;
				return t;
			};
			const markdown = (content) => {
				const t = new Token("inline", "", 0);
				t.content = content;
				t.children = [];
				t.level = 0;
				return t;
			};

			const replacement = [html(`<figure class="${classes.join(" ")}">\n`)];
			if (imageMd) replacement.push(markdown(imageMd));
			if (captionMd) {
				replacement.push(html("<figcaption>"), markdown(captionMd), html("</figcaption>\n"));
			}
			replacement.push(html("</figure>\n"));

			tokens.splice(i - 1, 3, ...replacement);
			i += replacement.length - 2; // -3 removed, +len added, loop's i++ covers one
		}
	});
}

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function (eleventyConfig) {
	eleventyConfig.amendLibrary("md", (md) => {
		md.use(markdownItFootnote);

		// Heading ids. Without these the TOC has nothing to link to — default
		// markdown-it emits <h2> with NO id.
		md.use(markdownItAnchor, {
			level: [2, 3],
			slugify,
			tabIndex: false,
			permalink: false,
		});

		// h2/h3 only: h1 is the post title, rendered by the layout, not the body.
		md.use(markdownItToc, {
			includeLevel: [2, 3],
			slugify,
			containerClass: "post-toc",
			containerHeaderHtml: '<div class="post-toc__title">Contents</div>',
			listType: "ul",
			// Keep footnote markers out of the TOC labels (one heading ends in
			// `[^17]`); rendering them here would duplicate the <sup> and its id.
			format: (str, mdInstance) =>
				mdInstance.renderInline(str.replace(/\[\^\d+\]/g, "").trim()),
		});

		md.use(wpCaption);
	});

	// -------------------------------------------------------------------------
	// `toc: true` in front matter -> a table of contents.
	//
	// markdown-it-table-of-contents is driven by a `[[toc]]` marker in the
	// markdown; it cannot see Eleventy's data cascade. A PREPROCESSOR bridges the
	// two: preprocessors run on the raw file body AFTER front matter is parsed and
	// BEFORE any template/markdown rendering, so the marker is in place by the
	// time markdown-it sees the document. The `.md` files themselves stay clean —
	// the front-matter flag is the only switch.
	//
	// The marker is injected immediately before the FIRST `## ` heading (i.e.
	// after the byline / epigraph / intro matter), falling back to the top of the
	// document if the post has no h2 at all.
	// -------------------------------------------------------------------------
	eleventyConfig.addPreprocessor("toc", "md", (data, content) => {
		if (data.toc !== true) return;
		if (content.includes("[[toc]]")) return;

		const lines = content.split("\n");
		const first = lines.findIndex((line) => /^##\s+\S/.test(line));
		if (first === -1) return; // no headings -> no TOC, and no stray marker

		lines.splice(first, 0, "[[toc]]", "");
		return lines.join("\n");
	});
}
