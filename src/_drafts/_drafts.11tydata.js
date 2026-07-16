// Directory data for src/_drafts/ — anything here is a draft: it behaves like a
// post (same layout, permalink and "posts" tag so it previews in `npm start`),
// but `published: false` keeps it out of production builds. Set
// `published: true` in an individual file to promote it without moving it.
export default {
	tags: ["posts"],
	layout: "layouts/post.njk",
	permalink: "/{{ page.fileSlug }}/",
	published: false,
};
