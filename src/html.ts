import * as htmlparser2 from "htmlparser2"
import type { Document, ChildNode, Element as DomElement } from "domhandler"
import type {Writable} from "stream"
import LineMap from "./linemap"

export
type TextElement = {
	type: "text"
	text: string
	filename: string
	linenumber: number
}

export
type TagElement = {
	type: "element",
	name: string
	attributes: Record<string, string | boolean>
	elements: Element[]
	filename: string
	linenumber: number
}

export
type Element = TextElement | TagElement

const singleTags = ["hr", "br", "link", "meta"]

const emptyTags: Record<string, string[]> = {
	input: ["required", "disabled", "autofocus", "checked"],
	textarea: ["required"],
	details: ["open"],

	form: ["v-ajax"],
	"v-sql": ["single-row"],
}

const neverClose = [
	"script",
	"select",
	"option",
	"form",
	"textarea",
	"progress",
	"span",
	"p",
	"div",
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
		} else if (k.startsWith("") && v === "") {
			ret["source"] = k
		} else {
			ret[k] = v
		}
	}

	return ret
}

function childrenToElements(children: ChildNode[], filename:string, lineMap:LineMap): Element[] {
	// Convert nodes created by htmlparser2 into our Element type

	const ret: Element[] = []

	for (const child of children) {
		const linenumber = lineMap.GetLine(child.startIndex || 0)
		switch (child.type) {
			case "tag":
			case "script":
			case "style":
				ret.push({
					type: "element",
					name: child.name,
					elements: childrenToElements(child.children, filename, lineMap),
					attributes: toAttributes(child),
					filename,
					linenumber,
				})
				break

			case "text":
				// Skip empty text nodes
				if (child.data.match(/^\s*$/)) continue

				ret.push({
					type: "text",
					text: child.data,
					filename,
					linenumber,
				})
				break
		}
	}

	return ret
}

function toElement(doc: Document, filename:string, lineMap:LineMap): Element[] {
	try {
		return childrenToElements(doc.children, filename, lineMap)
	} catch (e) {
		const msg = e instanceof Error ? e.message : e
		throw Error(`Parse error ${msg} in ${filename}`)
	}
}

export
function parse(htmlString: string, filename:string) {
	const lineMap = LineMap.FromString(htmlString)
	const dom = htmlparser2.parseDocument(htmlString, { recognizeSelfClosing:true, withStartIndices:true })
	return toElement(dom, filename, lineMap)
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

	   	if (canBeEmpty) {
			if ((v === true) || (v === "true")) {
				ret.push(`${k}`)
			}
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

function stringifyEl(el: Element, io:Writable): void {
	if (el.type === "text") {
		io.write(el.text)
	} else {
		const name = el.name
		const attrStr = serializeAttributes(el)
		if (singleTags.includes(name)) {
			io.write(`<${el.name}${attrStr}>`)
		} else {
			const nElements = el.elements?.length || 0
			if ((nElements > 0) || shouldNeverClose(name)) {
				io.write(`<${el.name}${attrStr}>`)
				serializeDoc(el.elements, io)
				io.write(`</${el.name}>`)
			} else {
				io.write(`<${el.name}${attrStr}/>`)
			}
		}
	}
}

function serializeDoc(doc: Element[], io:Writable) {
	doc.forEach((el) => stringifyEl(el, io))
}

export 
function serialize(doc: Element[], io:Writable) {
	serializeDoc(doc, io)
	io.end()
}

export 
function serializeHTML(doc: Element[], io:Writable) {
	io.write("<!DOCTYPE html>")
	serialize(doc, io)
}
