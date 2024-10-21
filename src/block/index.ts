import * as HTML from "../html"
import type {InitializationResponse, Block} from "../types"
import {findTagIfV} from "../find_tag"
import TextBlock from "./text_block"
import VtmlBlock from "./vtml_block"
import InbuiltBlock from "./inbuilt_block"
import RootBlock from "./root_block"

export type {default as VtmlBlock} from "./vtml_block"

export
function MakeBlock(el:HTML.Element, seq:number, parent:Block): InitializationResponse<Block> {
	if (el.type === "text") {
		return TextBlock.Init(el, seq, parent)
	} else {
		const tag = findTagIfV(el)

		if (!tag.ok) {
			return tag
		} else if (tag.result) {
			return VtmlBlock.Init(tag.result, el, seq, parent)
		} else {
			return InbuiltBlock.Init(el, seq, parent)
		}
	}
}


export
function MakeRootBlock(elements:HTML.Element[]) {
	return RootBlock.Init(elements)
}
