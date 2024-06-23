import {ParsedQs} from "qs"
import type { Element } from "./html"
import type FilterContext from "./filter_context"

export
type RootDataset = {
	path: string
	params: Record<string, string>
	query: ParsedQs
	method: string
	body?: any
	headers: Record<string, string|string[]|undefined>
	pageNotFound: boolean
}

export
type Branch = {
	elements: Element[]
	ctx: FilterContext
}

export
type RootFilter = (ctx:FilterContext) => Promise<Element[]>

export
type Filter = (ctx:FilterContext) => Promise<Branch>

export
type TagFilter = (el:Element) => Filter


export
type Tag = {
	name: string
	filter: TagFilter
}
