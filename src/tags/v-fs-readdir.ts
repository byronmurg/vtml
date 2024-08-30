import type { Tag } from "../types"
import type {TagElement} from "../html"
import { filterPass } from "../tag_utils"
import type FilterContext from "../filter_context"
import {readdir} from "fs/promises"
import * as utils from "../utils"

function preceeds(el:TagElement) {
	const path = utils.requireAttribute(el, "path")
	const target = utils.requireAttribute(el, "target")
	return async (ctx:FilterContext) => {
		const files = await readdir(path)
		return ctx.SetVar(target, files)
	}
}

export const XFsReaddir: Tag = {
	name: "v-fs-readdir",
	relativeAttributes: ["path"],
	loaderPreceeds: preceeds,
	render(el) {
		const pre = preceeds(el)

		return async (ctx) => {
			ctx = await pre(ctx)
			return filterPass(ctx)
		}
	},
}
