import type { TagBlock, Block } from "./types"
import type {TagElement} from "./html"
import {readFileSync} from "fs"
import pathLib from "path"

export
const joinPaths = pathLib.posix.join


export
function toNum(v:string|boolean): number {
	return parseInt(v.toString())
}

export
function getText(el:TagElement): string {
	return el.elements.find((child) => child.type === "text")?.text || ""
}

export
function findTitle(block:Block): string {
	return block.Find(byName("title"))?.requireOneTextChild() || "VTML app"
}

export
function findHint(block:Block, tag:string, attr:string): string|undefined {
	return block.Find(byName(tag))?.attr(attr)
}

export
function matchActionForm(block:TagBlock): boolean {
	return (block.getName() === "form") && block.hasAttr("v-name")
}

export
function matchPage(block:TagBlock): boolean {
	return (block.getName() === "v-page")
}

export
function byName(name:string) {
	return (block:TagBlock) => block.getName() === name
}

export
const matchPortal = byName("v-portal")

export
const matchExpose = byName("v-expose")

export
const readFile = (path:string) => readFileSync(path, "utf8")
