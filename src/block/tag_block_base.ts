import * as HTML from "../html"
import type {Block, TagBlock, RenderDescription, AttributeSpec} from "../types"
import FilterContext from "../filter_context"
import Debug from "debug"
import BlockCollection from "./block_collection"

export default
abstract class TagBlockBase {
	public children: BlockCollection
	debug: Debug.Debugger

	constructor(public el:HTML.TagElement, public readonly seq:number, public parent:Block) {
		this.debug = Debug("vtml:block:"+el.name)
		this.children = BlockCollection.Create(el.elements, this as unknown as Block)
	}

	element(): HTML.TagElement {
		return this.el
	}

	getName() {
		return this.el.name
	}

	getRenderDescription(): RenderDescription[] {
		return this.children.getRenderDescription()
	}

	Find(check:(el:TagBlock) => boolean): TagBlock|undefined {
		const self = this as unknown as TagBlock // Trust me it is
		if (check(self)) {
			return self
		} else {
			return this.children.findInChildren(check)
		}
	}

	FindAll(check:(el:TagBlock) => boolean): TagBlock[] {
		const self = this as unknown as TagBlock
		if (check(self)) {
			return [self]
		} else {
			return this.FindChildren(check)
		}
	}

	FindChildren(check:(el:TagBlock) => boolean): TagBlock[] {
		return this.children.findAllInChildren(check)
	}

	findAncestor(check:(el:TagBlock) => boolean): TagBlock|undefined {
		const self = this as unknown as TagBlock
		if (check(self)) {
			return self
		} else {
			return this.parent.findAncestor(check)
		}
	}

	renderChildren(ctx:FilterContext) {
		return this.children.renderAll(ctx)
	}

	getPath() {
		const ancestorPath = this.parent.getPath()
		return ancestorPath.concat(`${this.el.name}(${this.seq})`)
	}

	getPathString() {
		return this.getPath().join("->")
	}

	error(message:string): never {
		const path = this.getPathString()
		const filename = this.el.filename
		throw Error(`${message} in ${filename}:${path}`)
	}

	hasAttr(name:string): boolean {
		return name in this.el.attributes
	}

	attr(name:string): string {
		return (this.el.attributes[name] || "").toString()
	}

	boolAttr(name:string): boolean {
		const v = this.attr(name)
		return typeof(v) === "boolean" ? v : ((v === name) || (v === "true"))
	}


	optNumAttr(name:string): number|undefined {
		const v = this.attr(name)
		if (
			v === undefined) {
			return undefined
		} else if (typeof(v) === "number") {
			return v
		} else if (typeof(v) === "boolean") {
			return undefined
		} else if (v === "") {
			return undefined
		} else {
			return parseFloat(v)
		}
	}

	requireOneTextChild(): string {
		const children = this.el.elements
		const textEl = children[0]
		if ((children.length !== 1) || (textEl?.type !== "text")) {
			this.error(`must have exactly one text element`)
		}

		return (textEl.text || "").toString().trim()
	}

	templateAttributesSpec(ctx:FilterContext, attrs:HTML.TagElement["attributes"], spec:AttributeSpec) {
		const cpy:HTML.TagElement["attributes"] = {}

		for (const k in attrs) {
			const v = attrs[k]
			const type = spec[k] || {}

			// If it's a special or target/source attr
			if (type.strip || type.target || type.source || type.inject) {
				continue
			} else if (type.special) {
				// Special attributes are not templated
				cpy[k] = v
			} else if (typeof(v) === "string") {
				// Template it
				this.debug("template attribute", k, v)
				cpy[k] = ctx.templateStringSafe(v)
			} else {
				cpy[k] = v
			}
		}

		return cpy
	}





}



