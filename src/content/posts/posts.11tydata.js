// Directory data for posts — src/content/posts/<slug>.md, one flat file each.
// `page.fileSlug` is the filename, which is what makes <slug> both the file and
// the URL.
export default {
	tags: ["posts"],
	layout: "layouts/post.njk",
	permalink: "/{{ page.fileSlug }}/",

	eleventyComputed: {
		// Default byline: Steven Newcomb, the site's primary author.
		//
		// `authors` in front matter is the POST's own value and nothing else — the
		// author OBJECTS live on a differently-named global (`siteAuthors`, from
		// src/_data/siteAuthors.yaml), so there is no key collision and nothing to
		// filter out here. A post may write either form:
		//
		//   authors: adam-brett            (scalar — the common case)
		//   authors: [adam-brett, ...]     (list)
		//
		// Normalize both to an array of KEY STRINGS, and supply the default key
		// ONLY when the post named no author of its own. Do NOT declare
		// `authors: ["steven-newcomb"]` as plain directory data instead: the
		// cascade CONCATENATES arrays, so it would give every Adam or David post a
		// double byline (Steven AND the real author).
		authors: (data) => {
			const raw = data.authors;
			const keys = (Array.isArray(raw) ? raw : [raw])
				.filter((a) => typeof a === "string")
				.map((a) => a.trim())
				.filter(Boolean);
			return keys.length ? keys : ["steven-newcomb"];
		},


		// `tags` and `categories` are SEPARATE taxonomies.
		//
		// They used to be folded together here (categories merged into tags) so the
		// theme, which only knew about `tags`, would build an archive for each
		// migrated WordPress category. It no longer needs to: eleventy.config.js now
		// builds BOTH taxonomies in a single pass over the posts —
		// `collections.categories` -> /category/<slug>/ and `collections.tags` ->
		// /tag/<slug>/ — so `categories` stands on its own and must NOT be folded in.
		//
		// This computed value therefore only DEDUPES `tags`. It still exists, and it
		// still spreads `data.tags` back in, because computing REPLACES rather than
		// concatenates: `data.tags` here is ["posts", ...front-matter tags] (the
		// cascade concatenated the directory-data value above with the front matter),
		// and dropping it would unhook every post from the `posts` collection.
		//
		// `featured` is an INTERNAL term in both taxonomies (see INTERNAL_TERMS in
		// eleventy.config.js) — it is excluded from archives, not from the data.
		// WordPress's `uncategorized` term never made it into front matter (the
		// converter dropped it), so nothing has to filter it out here.
		tags: (data) => [...new Set(data.tags || [])],

		// `image` is a BARE FILENAME; Headline's templates want a rooted
		// `feature_image` URL. Images are published flat under /assets/images/, so
		// that is where it points. An explicit `feature_image` in front matter
		// still wins, so new posts can use the Headline convention directly.
		feature_image: (data) =>
			data.feature_image ||
			(data.image ? `/assets/images/${data.image}` : ""),

		// Alt text: WordPress carried none. Fall back to the title so the
		// <img> is never unlabelled.
		feature_image_alt: (data) => data.feature_image_alt || data.title,
	},
};
