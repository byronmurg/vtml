import type { Tag } from "../types"
import {stripFilter} from "../tag_utils"

// x-hints are just stripped here
export const XHintPort: Tag = {
	name: "x-hint-port",
	render: stripFilter,
}

export const XExpose: Tag = {
	name: "x-expose",
	render: stripFilter,
}

