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

export
function toNumberDefault(v:unknown, def: number): number {
	const num = toNumber(v)
	if (isNaN(num)) {
		return def
	} else {
		return num
	}
}

export
function toNumber(v:unknown): number {
	if (typeof(v) === "number") {
		return v
	} else if (typeof(v) === "string") {
		return parseFloat(v)
	} else {
		return NaN
	}
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

export const readFile = (path: string) => {
	try {
		return readFileSync(path, "utf8")
	} catch (e) {
		const message = e instanceof Error ? e.message : ""
		throw Error(message+` ${path}`)
	}
}

export
function deepFreeze<T extends object>(obj: T) {
	const propNames = Object.getOwnPropertyNames(obj)
	for (const name of propNames) {
		const value = (obj as Record<string|symbol, unknown>)[name]
		if (value && typeof value === "object") {
			deepFreeze(value)
		}
	}
	return Object.freeze(obj)
}
