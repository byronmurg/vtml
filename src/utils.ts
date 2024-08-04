import type { Element, TagElement } from "./html"
import type { ElementChain } from "./types"
import {readFileSync} from "fs"

export
function getAllAttributes(el:TagElement): Record<string, string|boolean> {
	return (el.attributes || {}) as Record<string, string|boolean>
}

export
function getBaseAttribute(el:TagElement, name:string): string|boolean|undefined {
	return el.attributes?.[name]
}

export
function getBoolAttribute(el:TagElement, name:string): boolean {
	const v = getBaseAttribute(el, name)
	// The attribute must be either boolean true or the same as the name
	return typeof(v) === "boolean" ? v : v === name
}

export
function getAttribute(el:TagElement, name:string): string {
	const v = getBaseAttribute(el, name) || ""
	return v.toString()
}

export
function optAttribute(el:TagElement, name:string): string|undefined {
	const attrs = el.attributes
	const v = attrs[name]
	return v === undefined ? v : v.toString()
}

export
function optNumAttribute(el:TagElement, name:string): number|undefined {
	const attrs = el.attributes
	const v = attrs[name]
	if (v === undefined) {
		return undefined
	} else if (typeof(v) === "number") {
		return v
	} else if (typeof(v) === "boolean") {
		return undefined
	} else {
		return parseFloat(v)
	}
}

export
function requireAttribute(el:TagElement, attr:string): string {
	const v = getAttribute(el, attr)
	if (v === "") {
		throw Error(`${el.name} must have a ${attr} attribute`)
	}
	return v
}

export
function getSource(el:TagElement) {
	return getAttribute(el, "source") || "$"
}


export
function requireSourceAttribute(el:TagElement) {
	return requireAttribute(el, "source")
}

export
function requireTargetAttribute(el:TagElement) {
	return requireAttribute(el, "target")
}

export
function getText(el:TagElement): string {
	const children = el.elements
	const textNode = children.find((child) => child.type === "text")
	return textNode?.text?.toString() || ""
}

export
function requireOneTextChild(el:TagElement): string {
	const children = el.elements
	const textEl = children[0]
	if ((children.length !== 1) || (textEl?.type !== "text")) {
		throw Error(`${el.name} must have exactly one text element`)
	}

	return (textEl.text || "").toString().trim()
}

export
function findElement(els:Element[], check:(e:TagElement) => boolean): TagElement[] {
	return els.flatMap((el) => {
		if (el.type !== "element") return []
		return (check(el)) ? [el] : findElement(el.elements||[], check)
	})
}

export
function findTitle(els:Element[]): string {
	const titles = findElement(els, (el) => el.name === "title")
	if (titles.length === 1) {
		const title = titles[0]
		return requireOneTextChild(title)
	} else if (titles.length > 1) {
		throw Error(`Too many title elements`)
	} else {
		return ""
	}
}

export
function findHint(el:Element[], tag:string, attr:string): string|undefined {
	const hintEl = findElement(el, (e) => e.name === tag)

	if (hintEl.length == 1) {
		return requireAttribute(hintEl[0], attr)
	} else if (hintEl.length > 2) {
		throw Error(`Found too many hints ${tag}`)
	} else {
		return undefined
	}
}

export
function findPostForms(el:Element[]): TagElement[] {
	return findElement(
		el,
		(e) => e.name === "form" && getAttribute(e, 'method').toLowerCase() == "post"
	)
}

export
function findInputs(el:TagElement): TagElement[] {
	const inputTypes = ["input", "select", "textarea"]
	return findElement(
		el.elements,
		(e) => inputTypes.includes(e.name)
	)
}

function doesElementContainElement(look:Element, search:Element): boolean {
	if (look === search) {
		return true
	} else if (look.type === "text") {
		return false
	} else {
		const children = look.elements
		return children.some((child) => doesElementContainElement(child, search))
	}
}

export
function getPrecedingElements(doc:Element[], search:Element): ElementChain[] {
	const work = (doc:Element[], search:Element): ElementChain[] => {
		const ret:ElementChain[] = []

		for (const el of doc) {
			if (el === search) {
				return ret
			} else if (el.type === "text") {
				// A preceeding text el can never do anything
				// so just skip it.
				continue
			} else if (doesElementContainElement(el, search)) {
				ret.push({ element:el, contains:true })
				return ret.concat(work(el.elements, search))
			} else {
				ret.push({ element:el })
			}
		}

		return ret //@NOTE shouldn't actually reach this
	}

	return work(doc, search)
}

export
function findElementByName(el:Element[], name:string): TagElement[] {
	return findElement(
		el,
		(e) => e.name === name
	)
}

export
function findPages(el:Element[]) {
	return findElementByName(el, "x-page")
}

export
function findExposes(el:Element[]): TagElement[] {
	return findElementByName(el, "x-expose")
}

export function bodyOrSrc(el:TagElement): string {
	const srcPath = getAttribute(el, "src")
	if (srcPath) {
		return readFileSync(srcPath, "utf8")
	} else {
		return requireOneTextChild(el)
	}
}


