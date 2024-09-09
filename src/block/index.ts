import * as HTML from "../html"
import {Block} from "../types"
import {findTagIfV} from "../find_tag"
import TextBlock from "./text_block"
import VtmlBlock from "./vtml_block"
import InbuiltBlock from "./inbuilt_block"
import RootBlock from "./root_block"

export type {default as VtmlBlock} from "./vtml_block"

export
function MakeBlock(el:HTML.Element, seq:number, parent:Block): Block {
	if (el.type === "text") {
		return new TextBlock(el, seq, parent)
	} else {
		const tag = findTagIfV(el)

		if (tag) {
			return new VtmlBlock(tag, el, seq, parent)
		} else {
			return new InbuiltBlock(el, seq, parent)
		}
	}
}


export
function MakeRootBlock(elements:HTML.Element[]): RootBlock {
	return new RootBlock(elements)
}
