import * as HTML from "../html"
import * as Vars from "../variables"
import type {Block, TagBlock, InitializationFailure, RenderDescription, AttributeSpec, ValidationError} from "../types"
import FilterContext from "../filter_context"
import Debug from "debug"
import BlockCollection from "./block_collection"
import {Err} from "../utils"

export default
abstract class TagBlockBase {
	debug: Debug.Debugger

	_children: BlockCollection|undefined
	get children() {
		if (! this._children) {
			throw Error(`children accessed before initialization`)
		} else {
			return this._children
		}
	}

	setChildren(children:BlockCollection) {
		this._children = children
	}


	constructor(public el:HTML.TagElement, public readonly seq:number, public parent:Block) {
		this.debug = Debug("vtml:block:"+el.name)
	}

	Fail(message:string): InitializationFailure {
		// A utility function to return a failure
		const err = this.mkError(message)
		return Err(err)
	}

	mkError(message:string): ValidationError {
		return {
			message,
			tag: this.el.name,
			filename: this.el.filename,
			linenumber: this.el.linenumber,
		}
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
			return [self].concat(this.FindChildren(check))
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

	areAnyChildrenDynamic() {
		return this.children.anyDynamic()
	}

	renderChildren(ctx:FilterContext) {
		return this.children.renderAll(ctx)
	}

	renderChildrenInOrder(ctx:FilterContext) {
		return this.children.renderInOrder(ctx)
	}

	getPath() {
		const ancestorPath = this.parent.getPath()
		return ancestorPath.concat(`${this.el.name}(${this.seq})`)
	}

	getPathString() {
		return this.getPath().join("->")
	}

	hasAttr(name:string): boolean {
		return name in this.el.attributes
	}

	attr(name:string): string {
		return (this.el.attributes[name] || "").toString()
	}

	boolAttr(name:string): boolean {
		const v = this.attr(name)
		return typeof(v) === "boolean" ? v : (this.hasAttr(name) && v !== "false")
	}

	requireAttr(key:string) {
		const v = this.attr(key)
		if (! v) {
			// Note that we should never reach this. The checkAttributes
			// should ensure that any required attributes are set.
			throw Error(`attribute '${key}' required`)
		}
		return v
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

	hasChildren(): boolean {
		return !!this.el.elements.length
	}

	hasOneTextBody() {
		return !!this.getOneTextChild()
	}

	hasNonTextChildren(): boolean {
		const children = this.el.elements
		if (children.length === 1) {
			const textEl = children[0]
			if (textEl.type === "text") {
				return false
			} else {
				return true
			}
		} else {
			return true
		}
	}

	getOneTextChild() {
		const children = this.el.elements
		if (children.length === 1) {
			const textEl = children[0]
			if (textEl.type === "text") {
				return textEl.text
			} else {
				return ""
			}
		} else {
			return ""
		}
	}

	requireOneTextChild(): string {
		const text = this.getOneTextChild()
		if (text === "") {
			// This should have already been checked by the bodyPolicy
			throw Error (`must have exactly one text element`)
		}
		return text
	}


	templateAttributesSpec(ctx:FilterContext, attrs:HTML.TagElement["attributes"], spec:AttributeSpec) {
		const cpy:HTML.TagElement["attributes"] = {}

		for (const k in attrs) {
			const v = attrs[k]
			const type = spec[k] || {}

			// If it's a special or target/source attr
			if (type.strip || type.target || type.source || type.inject) {
				continue
			} else if (typeof(v) === "boolean") {
				cpy[k] = v
			} else if (type.special) {
				// Special attributes are not templated
				cpy[k] = Vars.basicTemplate.sanitize(v)
			} else if (typeof(v) === "string") {
				// Template it
				cpy[k] = ctx.templateStringSafe(v)
			}
		}

		return cpy
	}





}



