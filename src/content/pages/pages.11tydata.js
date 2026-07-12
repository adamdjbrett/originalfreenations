// Directory data for pages — src/content/pages/<slug>.md, one flat file each.
// Same semantics as posts, minus the `posts` collection tag and the byline.
export default {
	layout: "layouts/page.njk",
	permalink: "/{{ page.fileSlug }}/",

	eleventyComputed: {
		// `image` is a BARE FILENAME under src/assets/images/; an explicit
		// `feature_image` in front matter wins. Same bridge as posts.
		feature_image: (data) =>
			data.feature_image ||
			(data.image ? `/assets/images/${data.image}` : ""),
		feature_image_alt: (data) => data.feature_image_alt || data.title,
	},
};
