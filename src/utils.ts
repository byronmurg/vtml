import type { ValidationError, InitializationResponse, InitializationFailure, InitializationSuccess, TagBlock, Block } from "./types"
import type { Element, TagElement, TextElement } from "./html"
import { readFileSync } from "fs"
import pathLib from "path"

export
function Ok<T>(result:T):InitializationSuccess<T> {
	return { ok:true, result }
}

export
function Err(error:ValidationError): InitializationFailure {
	return {
		ok: false,
		errors: [error],
	}
}

export
function ValidateAgg<T>(...results:InitializationResponse<T>[]): InitializationResponse<T[]> {
	// ValidateAgg checks through a list of InitializationResponses for errors
	// and returns all responses as an array
	const errors: ValidationError[] = []
	const result: T[] = []

	for (const res of results) {
		if (res.ok) {
			result.push(res.result)
		} else {
			errors.push(...res.errors)
		}
	}

	if (errors.length) {
		return { ok:false, errors }
	} else {
		return Ok(result)
	}
}

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
	// Find the first title element and return it's contents
	//
	// If there is no title element, it has an invalid body, or no body at all;
	// just return a nice default.
	return block.Find(byName("title"))?.getOneTextChild() || "VTML app"
}

export function findHint(
	block: Block,
	tag: string,
	attr: string
): string | undefined {
	return block.Find(byName(tag))?.attr(attr)
}

export function byName(name: string) {
	return (block: TagBlock) => block.getName() === name
}

function isTagElement(el: Element): el is TagElement {
	return el.type === "element"
}

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


export
function findNearestPagePath(block:TagBlock): string {
	return block.findAncestor(byName("v-page"))?.attr("path") || "/"
}
