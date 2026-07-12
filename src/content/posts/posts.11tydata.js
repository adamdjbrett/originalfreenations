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
		// `authors` is an overloaded key. The global data file
		// (src/_data/authors.yaml) puts the author OBJECTS on it, while a post's
		// front matter puts author KEYS on it — and the cascade concatenates
		// arrays, so the raw value here is
		// [...authors.yaml objects, ...keys from front matter].
		// `resolveAuthors` relies on exactly that shape: it matches the key
		// strings against the objects sitting in the same array.
		//
		// So keep the objects, and supply the default key ONLY when the post named
		// no author of its own. Declaring `authors: ["steven-newcomb"]` as plain
		// directory data instead would CONCATENATE with the front matter, giving
		// every Adam or David post a double byline (Steven AND the real author).
		authors: (data) => {
			const merged = Array.isArray(data.authors) ? data.authors : [];
			const objects = merged.filter((a) => a && typeof a === "object");
			const keys = merged.filter((a) => typeof a === "string" && a.trim());
			return [...objects, ...(keys.length ? keys : ["steven-newcomb"])];
		},


		// Fold WordPress `categories` into `tags`.
		//
		// The theme builds archives from `tags` only, so without this the 13
		// migrated categories — doctrine-of-discovery (9 posts), religion (7),
		// politics (6), biblical (6) … — would be dead metadata: no /tag/<x>/ page
		// would exist for them, and the /category/<x>/ redirects in
		// _redirects.json would all point at 404s.
		//
		// `data.tags` here is already ["posts", ...front-matter tags] because the
		// cascade concatenates arrays. Computing REPLACES rather than concatenates,
		// so spread the existing value back in — dropping it would unhook every
		// post from the `posts` collection.
		//
		// WordPress's `uncategorized` term never made it into front matter (the
		// converter dropped it), so nothing has to filter it out here.
		tags: (data) => [
			...new Set([...(data.tags || []), ...(data.categories || [])]),
		],

		// WordPress `coverImage` is a BARE FILENAME; Headline's templates want a
		// rooted `feature_image` URL. Images are published flat under
		// /assets/images/, so that is where it points. An explicit `feature_image`
		// in front matter still wins, so new posts can use the Headline convention
		// directly.
		feature_image: (data) =>
			data.feature_image ||
			(data.coverImage ? `/assets/images/${data.coverImage}` : ""),

		// Alt text: WordPress carried none. Fall back to the title so the
		// <img> is never unlabelled.
		feature_image_alt: (data) => data.feature_image_alt || data.title,
	},
};
