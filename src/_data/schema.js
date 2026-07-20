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
const orgMeta = meta.organization || {};
const organizationId = base + "/#organization";
const websiteId = base + "/#website";
const blogId = base + "/#blog";

const organization = {
	"@type": "Organization",
	"@id": organizationId,
	name: orgMeta.name || meta.title,
	url: orgMeta.url || base + "/",
};
if (meta.logo) organization.logo = { "@type": "ImageObject", url: abs(meta.logo) };
if (orgMeta.email) organization.email = orgMeta.email;
if (orgMeta.telephone) organization.telephone = orgMeta.telephone;
if (orgMeta.address) {
	organization.address = {
		"@type": "PostalAddress",
		streetAddress: orgMeta.address.street,
		addressLocality: orgMeta.address.locality,
		addressRegion: orgMeta.address.region,
		postalCode: orgMeta.address.postal_code,
		addressCountry: orgMeta.address.country,
	};
}
const sameAs = (meta.social_accounts || []).map((a) => a.href).filter(Boolean);
if (sameAs.length) organization.sameAs = sameAs;

const publisher = { "@id": organizationId };
const website = {
	"@type": "WebSite",
	"@id": websiteId,
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
};
const blog = {
	"@type": "Blog",
	"@id": blogId,
	name: meta.title,
	url: base + "/",
	description: meta.description,
	inLanguage: lang,
	publisher,
	isPartOf: { "@id": websiteId },
};

const siteGraph = {
	"@context": "https://schema.org",
	"@graph": [organization, website, blog],
};

export default {
	base,
	language: lang,
	publisher,
	organization,
	website,
	blog,
	siteGraph,
	blogId,
};
