import {ParsedQs} from "qs"
import type { TagElement, Element } from "./html"
import type FilterContext from "./filter_context"

export type InputValue = string|string[]|number|boolean

export type BodyType = Record<string, InputValue>

export
type ElementChain = {
	element: TagElement
	contains?: boolean
}

export
type RootDataset = {
	path: string
	matchedPath: string
	params: Record<string, string>
	query: ParsedQs
	method: string
	search?: string
	body?: unknown
	headers: Record<string, string|string[]|undefined>
	cookies: Record<string, string>
	pageNotFound: boolean
	error?: ResponseError
}

export
type Cookie = {
	value: string
	maxAge: number
}

export type CookieMap = Record<string, Cookie>



/////////////////////
// Render
/////////////////////

export
type RenderResponse = {
	elements: Element[]
	status: number
	cookies: CookieMap
	redirect?: string
	error?: string
}

export
type RenderHTMLResponse = RenderResponse & {
	html: string
}


/////////////////////
// Tag
/////////////////////

export
type Tag = {
	name: string

	render: TagFilter
	action?: TagFilter

	loaderPreceeds?: ChainPreceeds
	loaderContains?: ChainContains

	actionPreceeds?: ChainPreceeds
	actionContains?: ChainContains
}

/////////////////////
// Branch
/////////////////////

export
type Branch = {
	elements: Element[]
	ctx: FilterContext
}


/////////////////////
// Filter
/////////////////////


export
type Extractor = (tag:Tag) => TagFilter

export
type Cascade = {
	childs: (doc:Element[]|undefined) => Filter
	extract: Extractor
}

export
type Filter = (ctx:FilterContext) => Promise<Branch>

export
type RootFilter = (ctx:FilterContext) => Promise<RenderResponse>

export
type TagFilter = (el:TagElement, cascade:Cascade) => Filter


/////////////////////
// Chain
/////////////////////

export
type ChainPreceeds = (el:TagElement) => (ctx:FilterContext) => Promise<FilterContext>

export
type ChainContains = (el:TagElement) => (ctx:FilterContext) => ChainResult

export
type ChainResult = {
	ctx: FilterContext
	found: boolean
}

export
type FormResult = RenderResponse

export
type PortalResult = RenderResponse

export
type ExposeResult = {
	sendFile: string
	contentType?: string

	status: number
	cookies: CookieMap
	redirect?: string
	error?: string
}

export
type ResponseError = {
	code: number
	message: string
}

