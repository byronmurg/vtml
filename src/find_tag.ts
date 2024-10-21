import * as tagsIndex from "./tags"
import * as HTML from "./html"
import type {VtmlTag, InitializationResponse} from "./types"
import {Ok, Err} from "./utils"

const tags = Object.values(tagsIndex)

export
function findTag(el:HTML.TagElement) {
	return tags.find((tag) => tag.name === el.name)
}

export
function findTagIfV(el:HTML.TagElement): InitializationResponse<VtmlTag|undefined> {
	const tag = findTag(el)
	if (el.name.startsWith("v-") && !tag) {
		return Err({
			message: `Unknown VTML tag`,
			tag: el.name,
			filename: el.filename,
			linenumber: el.linenumber,
		})
	}
	return Ok(tag)
}
