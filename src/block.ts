import * as HTML from "./html"
import {Branch} from "./types"
import FilterContext from "./filter_context"
//import lodash from "lodash"

type PreparedElement = {
	render: (ctx:FilterContext) => Branch
	chain?: (ctx:FilterContext) => Promise<FilterContext>
	cascade?: (ctx:FilterContext) => Promise<FilterContext>
}

type Tag = {
	name: string
	relativeAttributes?: string[]

	prepare: (el:HTML.TagElement, block:Block) => PreparedElement
}


interface Block {
	Render(ctx:FilterContext): Branch
}


class VtmlBlock implements Block {
	private renderer: PreparedElement

	constructor(
		private tag: Tag,
		private el:HTML.TagElement,
		private children:ReadonlyArray<Block>
	) {
		this.renderer = tag.prepare(el, this)
	}

	Render(ctx:FilterContext): Branch {
		return this.renderer.render(ctx)
	}

	renderChildren(ctx:FilterContext): Branch {
		const elements:HTML.Element[] = []

		for (const child of this.children) {
			const branch = child.Render(ctx)
			ctx = branch.ctx
			elements.push(...branch.elements)
		}

		return { ctx, elements }
	}

	static Create(tag:Tag, el:HTML.TagElement) {
		const children = el.elements.map(MakeBlock)
		return new VtmlBlock(tag, el, children)
	}
}

class TextBlock implements Block {
	constructor(private el:HTML.TextElement) {

	}

	Render(ctx:FilterContext): Branch {
		return { ctx, elements:[this.el] }
	}

	static Create(el:HTML.TextElement) {
		return new TextBlock(el)
	}
}

class InbuiltBlock implements Block {
	constructor(private el:HTML.TagElement, private children:Block[]) {
		
	}

	Render(ctx:FilterContext): Branch {
		const elements:HTML.Element[] = []

		for (const child of this.children) {
			const branch = child.Render(ctx)
			ctx = branch.ctx
			elements.push(...branch.elements)
		}

		const resp = {
			...this.el,
			elements,
		}

		return { ctx, elements:[resp] }
	}

	static Create(el:HTML.TagElement) {
		const children = el.elements.map(MakeBlock)
		return new InbuiltBlock(el, children)
	}
}

export
function MakeBlock(el:HTML.Element): Block {
	if (el.type === "text") {
		return TextBlock.Create(el)
	} else {
		const tag = findTagIfX(el)

		if (tag) {
			return VtmlBlock.Create(tag, el)
		} else {
			return InbuiltBlock.Create(el)
		}
	}
}
