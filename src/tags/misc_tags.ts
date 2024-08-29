import type { Tag } from "../types"
import {stripFilter, passthroughFilter} from "../tag_utils"

// v-hints are just stripped here
export const XHintPort: Tag = {
	name: "v-hint-port",
	render: stripFilter,
}

export const XExpose: Tag = {
	name: "v-expose",
	render: stripFilter,
}

export const XPortal: Tag = {
	name: "v-portal",
	render: passthroughFilter,
}

export const XPass: Tag = {
	name: "v-pass",
	render: passthroughFilter
}
