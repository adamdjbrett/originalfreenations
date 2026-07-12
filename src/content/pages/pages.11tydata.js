// Directory data for the page bundles (src/content/pages/<slug>/index.md).
// Same bundle semantics as posts, minus the `posts` collection tag.
export default {
	layout: "layouts/page.njk",
	permalink: "/{{ page.fileSlug }}/",

	eleventyComputed: {
		feature_image: (data) =>
			data.feature_image ||
			(data.coverImage ? `/assets/images/${data.coverImage}` : ""),
		feature_image_alt: (data) => data.feature_image_alt || data.title,
	},
};
