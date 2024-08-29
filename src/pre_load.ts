import type { TagElement, Element } from "./html"
import * as HTML from "./html"
import {readFileSync} from "node:fs"
import path from "node:path"
import * as utils from "./utils"

const srcElements = [
	"v-expose",
	"v-json",
	"v-yaml",
	"v-markdown",
]

const isSrcElement = (el:TagElement) => srcElements.includes(el.name)

function preFilter(el:Element, dir:string): Element {
	if (el.type === "text") return el

	const children = preFilterElements(el.elements, dir)

	return {
		...el,
		elements: children,
	}
}

function preFilterElements(elements:Element[], dir:string): Element[] {
	return elements.flatMap((child) => {
		if (child.type === "text") {
			return child
		} else if (child.name === "v-include") {
			const src = utils.requireAttribute(child, "src")
			return preLoadInclude(path.posix.join(dir, src))
		} else if (isSrcElement(child)) {
			// If the element has a src attribute make sure
			// that it is relative to the file.
			if (child.attributes.src){
				const src = child.attributes.src.toString()
				child.attributes.src = path.posix.join(dir, src)
			}
			return child
		} else {
			return preFilter(child, dir)
		}
	})
}

function loadXml(filePath:string): Element[] {
	const filedata = readFileSync(filePath, "utf8")
	return HTML.parse(filedata, filePath)
}

function preLoadInclude(filePath:string): Element[] {
	const preDoc = loadXml(filePath)
	const newDir = path.dirname(filePath)

	return preFilterElements(preDoc, newDir)
}

export default
function preLoad(filePath:string): Element[] {
	const preDoc = loadXml(filePath)
	const newDir = path.dirname(filePath)

	return preFilterElements(preDoc, newDir)
}

