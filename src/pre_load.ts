import type { Element } from "./html"
import * as HTML from "./html"
import {readFileSync} from "node:fs"
import path from "node:path"
import * as utils from "./utils"

function preFilter(el:Element, dir:string): Element {
	const elements = el.elements || []

	const children = elements.flatMap((child) => {
		if (child.name === "x-include") {
			const src = utils.requireAttribute(child, "src")
			return preLoadInclude(path.join(dir, src), dir)
		} else {
			return preFilter(child, dir)
		}
	})

	return {
		...el,
		elements: children,
	}
}

function loadXml(filePath:string): Element[] {
	const filedata = readFileSync(filePath, "utf8")
	return HTML.parse(filedata)
}

function preLoadInclude(filePath:string, dir:string): Element[] {
	const preDoc = loadXml(filePath)
	const newDir = path.dirname(filePath)

	return preDoc.map((child) => preFilter(child, newDir))
}

export default
function preLoad(filePath:string): Element[] {
	const preDoc = loadXml(filePath)
	const newDir = path.dirname(filePath)

	return preDoc.map((child) => preFilter(child, newDir))
}

