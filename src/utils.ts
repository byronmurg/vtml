import type { TagBlock, Block } from "./types"
import type { Element, TagElement, TextElement } from "./html"
import { readFileSync } from "fs"
import pathLib from "path"

export const joinPaths = pathLib.posix.join

export function findElements(
	el: TagElement,
	check: (e: TagElement) => boolean
): TagElement[] {
	if (check(el)) {
		return [el]
	} else {
		return findElementsInList(el.elements, check)
	}
}

export
function findElementsInList(els:Element[], check:(e:TagElement) => boolean): TagElement[] {
		return els
			.filter(isTagElement)
			.flatMap((e) => findElements(e, check))
}

export function toNum(v: string | boolean | undefined, def: number): number {
	return v === undefined ? def : parseInt(v.toString())
}

export function getText(el: TagElement): string {
	return (
		(
			el.elements.find((child) => child.type === "text") as
				| TextElement
				| undefined
		)?.text || ""
	)
}

export function findTitle(block: Block): string {
	return block.Find(byName("title"))?.requireOneTextChild() || "VTML app"
}

export function findHint(
	block: Block,
	tag: string,
	attr: string
): string | undefined {
	return block.Find(byName(tag))?.attr(attr)
}

export function matchActionForm(block: TagBlock): boolean {
	return block.getName() === "form" && block.hasAttr("v-name")
}

export function matchPage(block: TagBlock): boolean {
	return block.getName() === "v-page"
}

export function byName(name: string) {
	return (block: TagBlock) => block.getName() === name
}

function isTagElement(el: Element): el is TagElement {
	return el.type === "element"
}

export const matchPortal = byName("v-portal")

export const matchExpose = byName("v-expose")

export const readFile = (path: string) => readFileSync(path, "utf8")
