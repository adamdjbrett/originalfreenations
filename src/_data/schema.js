// schema.js — schema.org structured data (JSON-LD) that AUTO-FILLS from
// metadata.yaml, so the site's WebSite/Blog/publisher JSON-LD stays in sync
// with site settings (which are Pages-CMS-editable). Consumed by head.njk.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

let meta = {};
try {
	meta = yaml.load(
		readFileSync(fileURLToPath(new URL("./metadata.yaml", import.meta.url)), "utf8"),
	) || {};
} catch {
	meta = {};
}

const base = String(meta.url || "").replace(/\/+$/, "");
const lang = meta.language || "en";
const abs = (u) => (!u ? u : String(u).startsWith("http") ? u : base + u);

const publisher = {
	"@type": "Organization",
	name: meta.title,
	url: base + "/",
};
if (meta.logo) publisher.logo = { "@type": "ImageObject", url: abs(meta.logo) };
const sameAs = (meta.social_accounts || []).map((a) => a.href).filter(Boolean);
if (sameAs.length) publisher.sameAs = sameAs;

export default {
	base,
	language: lang,
	publisher,
	// WebSite node with a SearchAction pointing at the /search/ page.
	website: {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: meta.title,
		url: base + "/",
		description: meta.description,
		inLanguage: lang,
		publisher,
		potentialAction: {
			"@type": "SearchAction",
			target: {
				"@type": "EntryPoint",
				urlTemplate: base + "/search/?q={search_term_string}",
			},
			"query-input": "required name=search_term_string",
		},
	},
	// Blog node for the publication itself.
	blog: {
		"@context": "https://schema.org",
		"@type": "Blog",
		name: meta.title,
		url: base + "/",
		description: meta.description,
		inLanguage: lang,
		publisher,
	},
};
