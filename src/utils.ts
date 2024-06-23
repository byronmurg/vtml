import type { Element } from "./html"

export
function getAllAttributes(el:Element): Record<string, string|boolean> {
	return (el.attributes || {}) as Record<string, string|boolean>
}

export
function getBaseAttribute(el:Element, name:string): string|boolean|undefined {
	return el.attributes?.[name]
}

export
function getBoolAttribute(el:Element, name:string): boolean {
	const v = getBaseAttribute(el, name)
	// The attribute must be either boolean true or the same as the name
	return typeof(v) === "boolean" ? v : v === name
}

export
function getAttribute(el:Element, name:string): string {
	const v = getBaseAttribute(el, name) || ""
	return v.toString()
}

export
function optAttribute(el:Element, name:string): string|undefined {
	const attrs = el.attributes || {}
	const v = attrs[name]
	return v === undefined ? v : v.toString()
}

export
function optNumAttribute(el:Element, name:string): number|undefined {
	const attrs = el.attributes || {}
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
function requireAttribute(el:Element, attr:string): string {
	const v = getAttribute(el, attr)
	if (v === "") {
		throw Error(`${el.name} must have a ${attr} attribute`)
	}
	return v
}

export
function getSource(el:Element) {
	return getAttribute(el, "source") || "$"
}


export
function requireSourceAttribute(el:Element) {
	return requireAttribute(el, "source")
}

export
function requireTargetAttribute(el:Element) {
	return requireAttribute(el, "target")
}

export
function getText(el:Element): string {
	const children = el.elements || []
	const textNode = children.find((child) => child.type === "text")
	return textNode?.text?.toString() || ""
}

export
function requireOneTextChild(el:Element): string {
	const children = el.elements || []
	const textEl = children[0]
	if ((children.length !== 1) || (textEl?.type !== "text")) {
		throw Error(`${el.name} must have exactly one text element`)
	}

	return (textEl.text || "").toString().trim()
}

export
function requireSpecialChild(el:Element, searchTag:string): Element[] {
	const children = el.elements || []
	const special = children.find((child) => child.name === searchTag)

	if (! special) {
		throw Error(`${el.name} must have a ${searchTag} element`)
	}

	const other = children.filter((child) => child.name !== searchTag)
	return [special, ...other]
}

type SpecialFilterOutput = {
	special: Element[]
	other: Element[]
}

export
function findSpecialChildren(el:Element, searchTag:string): SpecialFilterOutput {
	const children = el.elements || []
	const special = children.filter((child) => child.name === searchTag)
	const other = children.filter((child) => child.name !== searchTag)

	return {special, other}
}

export
function requireSpecialChildren(el:Element, searchTag:string): SpecialFilterOutput {
	const out = findSpecialChildren(el, searchTag)
	if (out.special.length < 1) {
		throw Error(`${el.name} must have at least one ${searchTag} element`)
	}
	return out
}

export
function filterElement(els:Element[], check:(e:Element) => boolean): Element[] {
	return els.filter(check).map((el) => ({
		...el,
		elements: findElement(el.elements||[], check)
	}))
}

export
function not<T>(cbk:(i:T) => boolean) {
	return (ii:T) => !cbk(ii)
}

export
function findElement(els:Element[], check:(e:Element) => boolean): Element[] {
	return els.flatMap((el) => {
		return (check(el)) ? [el] : findElement(el.elements||[], check)
	})
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
function findPostForms(el:Element[]): Element[] {
	return findElement(
		el,
		(e) => e.name === "form" && getAttribute(e, 'method') == "POST"
	)
}

export
function findInputs(el:Element): Element[] {
	const inputTypes = ["input", "select", "textarea"]
	return findElement(
		el.elements||[],
		(e) => inputTypes.includes(e.name||"")
	)
}

export
function findPages(el:Element[]): Element[] {
	return findElement(
		el,
		(e) => e.name === "x-page"
	)
}
