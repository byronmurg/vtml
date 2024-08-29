import * as htmlparser2 from "htmlparser2"
import type { Document, ChildNode, Element as DomElement } from "domhandler"

export
type TextElement = {
	type: "text"
	text: string
	startIndex: number
	filename: string
}

export
type TagElement = {
	type: "element",
	name: string
	attributes: Record<string, string | boolean>
	elements: Element[]
	startIndex: number
	filename: string
}

export
type Element = TextElement | TagElement

const singleTags = ["hr", "br", "link", "meta"]

const emptyTags: Record<string, string[]> = {
	input: ["required", "disabled"],
	details: ["open"],
	form: ["v-ajax"],
	"v-sql": ["single-row"],
	"v-sql-action": ["single-row"],
}

const neverClose = [
	"script",
	"progress",
	"span",
	"p",
	"head",
	"header",
	"footer",
	"table",
	"tbody",
	"tfoot",
]

const shouldNeverClose = (tag:string) => neverClose.includes(tag)

function canBeEmptyAttribute(tag: string, attribute: string): boolean {
	const empties = emptyTags[tag] || []
	return empties.includes(attribute)
}

function toAttributes(el: DomElement): TagElement["attributes"] {
	const ret: TagElement["attributes"] = {}

	for (const k in el.attribs) {
		const v = el.attribs[k]
		if (v === "" && canBeEmptyAttribute(el.name, k)) {
			ret[k] = true
		} else {
			ret[k] = v
		}
	}

	return ret
}

function childrenToElements(children: ChildNode[], filename:string): Element[] {
	// Convert nodes created by htmlparser2 into our Element type

	const ret: Element[] = []

	for (const child of children) {
		switch (child.type) {
			case "tag":
			case "script":
			case "style":
				ret.push({
					type: "element",
					name: child.name,
					elements: childrenToElements(child.children, filename),
					attributes: toAttributes(child),
					startIndex: child.startIndex || NaN,
					filename,
				})
				break

			case "text":
				// Skip empty text nodes
				if (child.data.match(/^\s*$/)) continue

				ret.push({
					type: "text",
					text: child.data,
					startIndex: child.startIndex || NaN,
					filename,
				})
				break
		}
	}

	return ret
}

function toElement(doc: Document, filename:string): Element[] {
	return childrenToElements(doc.children, filename)
}

export
function parse(htmlString: string, filename:string) {
	const dom = htmlparser2.parseDocument(htmlString, { recognizeSelfClosing:true, withStartIndices:true })
	return toElement(dom, filename)
}

export
const escapeHtml = (unsafe:string) => {
    return unsafe.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}


function serializeAttributes(el: TagElement): string {
	const ret: string[] = []

	for (const k in el.attributes) {
		const v = el.attributes[k]
		const canBeEmpty = canBeEmptyAttribute(el.name, k)

		if (((v === true) || (v === "true")) && canBeEmpty) {
			ret.push(`${k}`)
		} else if (((v === false) || (v === "false")) && canBeEmpty) {
			continue
		} else {
			ret.push(`${k}="${v}"`)
		}
	}

	if (ret.length) {
		return " " + ret.join(" ")
	} else {
		return ""
	}
}

function stringifyEl(el: Element): string {
	if (el.type === "text") {
		return el.text
	} else {
		const name = el.name
		const attrStr = serializeAttributes(el)
		if (singleTags.includes(name)) {
			return `<${el.name}${attrStr}>`
		} else {
			const nElements = el.elements?.length || 0
			if ((nElements > 0) || shouldNeverClose(name)) {
				const content = serialize(el.elements || [])
				return `<${el.name}${attrStr}>${content}</${el.name}>`
			} else {
				return `<${el.name}${attrStr} />`
			}
		}
	}
}

export
function serialize(doc: Element[]): string {
	return doc.map(stringifyEl).join("")
}
