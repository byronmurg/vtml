import type { Tag } from "../types"
import {stripFilter, passthroughFilter} from "../tag_utils"

// x-hints are just stripped here
export const XHintPort: Tag = {
	name: "x-hint-port",
	render: stripFilter,
}

export const XExpose: Tag = {
	name: "x-expose",
	render: stripFilter,
}

// Empty tag is basically for '<>' tags.
// They are useful for creating an isolated
// variable scope

export const emptyTag: Tag = {
	name: "",
	render: passthroughFilter
}
