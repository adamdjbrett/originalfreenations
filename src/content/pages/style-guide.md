---
title: "Style Guide"
description: ""
date: 2026-07-12
custom_excerpt: "A reference page for every text and media element this site can render — headings, lists, quotes, code, tables and images at each width."
image: "Old-City-of-Rome-1024x674.webp"
feature_image_alt: "Stone arches of the old city of Rome"
feature_image_caption: "The feature image sits above the article body, with an optional caption like this one."
---

This page exists for writers and editors. It shows, in one place, everything the
Original Free Nations theme knows how to render: the type scale, the list and
quote styles, code, tables, and images at each of the three widths. If an element
does not appear here, the theme has no styling for it — use something on this
page instead.

## Headings

Headings step down from `h2` to `h6`. The page title above is the `h1`; a second
`h1` inside an article is avoided so the document outline stays sound. All six
sizes come from the fluid type scale, so they resize with the viewport rather
than snapping at a breakpoint.

## Heading two

### Heading three

#### Heading four

##### Heading five

###### Heading six

## Paragraphs and inline text

Original Free Nations publishes long-form scholarship, so the body text is tuned
for reading at length: a comfortable measure, generous leading, and a fluid base
size. Within a paragraph you can set text in **bold**, in _italic_, in **_bold
italic_**, or as a [link to another page on the site](/about/). Inline
`code spans` are also available, as are footnote-style asides set in
parentheses (like this one).

A second paragraph shows the spacing between blocks. Paragraphs are separated by
vertical rhythm rather than indentation, which is the convention for screen
reading and keeps scanned text legible on small displays.

## Blockquotes

A standard blockquote carries a rule down its left edge and is used for quoted
source material:

> The Latin term _dominium_ is typically translated into English as
> "domination," and yet the pattern it names is seldom read that way in the
> literature of federal Indian law.

Attribution can follow the quote as a short paragraph, or be folded into the
quote itself with a citation line.

A pull quote (`blockquote.kg-blockquote-alt`) is the alternative treatment,
used to lift a line out of the surrounding argument:

<blockquote class="kg-blockquote-alt">Language is never neutral: the words a legal system chooses are the ideas it enforces.</blockquote>

## Lists

An unordered list:

- Original nations and peoples
- Ancestral homelands and sacred sites
- Language, ceremony, and cultural continuity
- Treaties and international law

An ordered list, with nesting:

1. The papal bulls of the fifteenth century
2. The doctrine of Christian discovery
   1. Its arrival in United States case law
   2. Its restatement in later rulings
3. Contemporary consequences
   - In federal Indian law
   - In land and water disputes

Nested unordered items sit inside their parent:

- Primary sources
  - Papal documents
  - Treaty texts
    - Ratified treaties
    - Unratified agreements
- Secondary sources

## Code

Inline code such as `feature_image` or `src/content/pages/` is set in the
monospace stack at a size relative to the surrounding prose. A fenced block
carries its own tinted background and scrolls horizontally rather than wrapping:

{% raw %}
```js
// Front matter carries a bare filename; the build resolves the path.
export default {
  layout: "layouts/page.njk",
  permalink: "/{{ page.fileSlug }}/",
};
```
{% endraw %}

```yaml
title: "Style Guide"
description: ""
date: 2026-07-12
image: "Old-City-of-Rome-1024x674.webp"
```

## Images

An image at the standard content width, with a caption:

<figure class="kg-card kg-image-card kg-card-hascaption">
	<img class="kg-image" src="/assets/images/Brown_university_john_carter_brown_lib-1024x680.webp" alt="Reading room of the John Carter Brown Library" width="1024" height="680" loading="lazy" decoding="async">
	<figcaption>Standard width. The caption sits directly beneath the image and is set smaller than the body text.</figcaption>
</figure>

A wide image (`kg-width-wide`) breaks out past the text column on either side:

<figure class="kg-card kg-image-card kg-width-wide kg-card-hascaption">
	<img class="kg-image" src="/assets/images/SanFranciscoPeaks-JG.webp" alt="The San Francisco Peaks under an open sky" width="2023" height="1347" loading="lazy" decoding="async">
	<figcaption>Wide. Use this for landscape images that deserve more room than the measure allows.</figcaption>
</figure>

A full-width image (`kg-width-full`) runs edge to edge:

<figure class="kg-card kg-image-card kg-width-full kg-card-hascaption">
	<img class="kg-image" src="/assets/images/sam-bark-422820-unsplash.webp" alt="An open landscape at dusk" width="4496" height="3000" loading="lazy" decoding="async">
	<figcaption>Full width. Reserve this for a single image with real weight; it interrupts the reading column entirely.</figcaption>
</figure>

Images that carry `width` and `height` attributes open in the lightbox when
clicked. Every image on the site lives in `/assets/images/` and ships exactly as
it sits on disk, so add new rasters already converted to `.webp`.

## Tables

Tables are bordered, with a heavier rule under the header row. Long tables scroll
rather than compress:

| Document | Year | Issued by | Effect claimed |
| --- | --- | --- | --- |
| Dum Diversas | 1452 | Nicholas V | Licence to subjugate |
| Romanus Pontifex | 1455 | Nicholas V | Title to lands "discovered" |
| Inter Caetera | 1493 | Alexander VI | Division of claimed lands |
| Johnson v. M'Intosh | 1823 | U.S. Supreme Court | Discovery as U.S. law |

## Horizontal rule

A horizontal rule marks a break in the argument rather than a new section:

---

It gets extra space above and below it, so it reads as a pause.

## Embeds

An embed (`kg-embed-card`) centers third-party content in the column:

<figure class="kg-card kg-embed-card">
	<iframe src="https://stevennewcomb.substack.com/embed" width="480" height="320" style="border:1px solid #EEE; background:white;" frameborder="0" scrolling="no" title="Subscribe to Steven Newcomb on Substack"></iframe>
</figure>

## Dark mode

Every element on this page is defined in both light and dark mode. Use the theme
toggle in the header to check any change against both — surfaces, borders, code
blocks and captions all remap, and images are dimmed very slightly in dark mode
so they do not glare.
