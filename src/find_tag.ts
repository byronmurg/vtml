import * as tagsIndex from "./tags"
import * as HTML from "./html"

const tags = Object.values(tagsIndex)

export
function findTag(el:HTML.TagElement) {
	return tags.find((tag) => tag.name === el.name)
}

export
function findTagIfV(el:HTML.TagElement) {
	const tag = findTag(el)
	if (el.name.startsWith("v-") && !tag) {
		throw Error(`Unknown VTML tag ${el.name}`)
	}
	return tag
}
