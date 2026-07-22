// Directory data for src/_drafts/ — anything here is a draft: it behaves like a
// post (same layout, permalink and "posts" tag so it previews in `npm start`),
// but the production preprocessor keeps every file in this directory out of
// production, regardless of its `published` value. Move a post out to publish it.
export default {
	tags: ["posts"],
	layout: "layouts/post.njk",
	permalink: "/{{ page.fileSlug }}/",
	published: false,
};
