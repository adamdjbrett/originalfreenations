// Directory data for src/_drafts/.
//
// Anything here is a draft and is NEVER written to the site — not by
// `npm run build`, not by `npm run dev`. The `drafts` preprocessor in
// eleventy.config.js withholds any file under this directory, so setting
// `published: true` here will NOT promote a post. To publish a draft, move the
// file into src/content/posts/.
//
// The layout/permalink/tags below only exist so a draft still resolves as a
// well-formed post if it is moved out.
export default {
	tags: ["posts"],
	layout: "layouts/post.njk",
	permalink: "/{{ page.fileSlug }}/",
	published: false,
};
