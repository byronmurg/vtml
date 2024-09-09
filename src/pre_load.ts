import type { Element } from "./html"
import * as HTML from "./html"
import {readFileSync} from "node:fs"
import path from "node:path"
import {findTag} from "./find_tag"

function getRelativeAttrs(el:Element): string[] {
	if (el.type === "element") {
		const tag = findTag(el)
		if (! tag) {
			return []
		}

		const relativeAttrs = []
		for (const k in tag.attributes) {
			const v = tag.attributes[k]
			if (v.relative) {
				relativeAttrs.push(k)
			}
		}

		return relativeAttrs
	} else {
		return []
	}
}

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
		const relativeAttrs = getRelativeAttrs(child)

		if (child.type === "text") {
			return child
		} else if (child.name === "v-include") {
			const src = child.attributes.src.toString()
			if (! src) {
				throw Error(`No src attribute on v-exclude in ${child.filename}`)
			}
			return preLoadInclude(path.posix.join(dir, src))
		} else if (relativeAttrs.length) {
			// If the tag has a relative attribute join it
			// with the current dir.
			for (const attr of relativeAttrs) {
				const value = child.attributes[attr]
				if (value) {
					child.attributes[attr] = path.posix.join(dir, value.toString())
				}
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

