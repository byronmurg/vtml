import type {ParsedQs} from "qs"
import type { TagElement, Element } from "./html"
import type FilterContext from "./filter_context"
import type {VtmlBlock} from "./block"
import type * as HTML from "./html"

export type InputValue = string|string[]|number|boolean

export type BodyType = Record<string, InputValue>

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
	action: boolean
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
type ResponseBasic = {
	status: number
	cookies: CookieMap
	redirect?: string
	error?: string
}

export
type RenderResponse = ResponseBasic & {
	elements: Element[]
}

// AttributeOptions

type AttributeOptions = {
	required?: boolean  // The attr is required
	special?: boolean   // The attr should not be templated
	strip?: boolean     // Strip the attr from the result element

	inject?: boolean    // Specifies a variable for it's children
	target?: boolean    // Specifies a target
	source?: boolean    // Should be source format and not templated

	relative?: boolean
}

export
type AttributeSpec = Record<string, AttributeOptions>

/////////////////////
// Tag
/////////////////////

export
type TagCommon = {
	name: string
	attributes: AttributeSpec
}

export
type VtmlTag = TagCommon & {

	consumesError?: boolean
	providesError?: boolean
	allowExtraAttributes?: boolean
	isLoop?: boolean
	scriptTemplate?: boolean

	prepare: (block:VtmlBlock) => {
		injectGlobals: () => string[]
		contains: (ctx:FilterContext) => Promise<ChainResult>
		preceeds: (ctx:FilterContext) => Promise<FilterContext>
		render: (ctx:FilterContext) => Promise<Branch>
	}
}


/////////////////////
// Isolate
/////////////////////

export type IsolateReponse = ChainResult & Branch

export
type Isolate = {
	run: (ctx:FilterContext) => Promise<IsolateReponse>
	globals: string[]
}

export
type Chain = {
	run: (ctx:FilterContext) => Promise<ChainResult>
	globals: string[]
}

/////////////////////
// Blocks
/////////////////////

export
interface Block {

	Find(check:(el:TagBlock) => boolean): TagBlock|undefined
	FindAll(check:(el:TagBlock) => boolean): TagBlock[]
	FindChildren(check:(el:TagBlock) => boolean): TagBlock[]

	findAncestor(check:(el:TagBlock) => boolean): TagBlock|undefined

	error(msg:string): never

	Render(ctx:FilterContext): Promise<Branch>
	RenderConstant(): HTML.Element

	CheckPreceeds(ctx:FilterContext): Promise<FilterContext>

	Isolate(): Isolate

	createChildChain(seq:number, consumes:string[]): Chain

	getRenderDescription(): RenderDescription[]

	getName(): string
	getPath(): string[]

	// Create a variable report
	report(): BlockReport

	// Check all variables are provided
	checkConsumers(input:string[], globals:string[]): void

	// Is this a dynamic tag
	isDynamic(): boolean
}


export
interface TagBlock extends Block {
	hasAttr(name:string): boolean
	attr(name:string): string
	boolAttr(name:string): boolean
	optNumAttr(name:string): number|undefined
	requireOneTextChild(): string
	debug(msg:string): void

	element(): TagElement
}


/////////////////////
// Report
/////////////////////

export
type BlockReport = {
	id: string

	provides: string[]
	consumes: string[]
	injects: string[]
	globals: string[]

	doesConsumeError: boolean
}


/////////////////////
// Description
/////////////////////


export type RenderDescription = {
	name: string
	report: BlockReport
	order: RenderDescription[]
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
// Chain
/////////////////////

export
type ChainResult = {
	ctx: FilterContext
	found: boolean
}

export
type FormResult = RenderResponse & {
	output?: unknown
}

export
type PortalResult = RenderResponse

export
type ExposeResult = ResponseBasic & {
	sendFile: string
	contentType?: string
}

export
type ResponseError = {
	code: number
	message: string
}

