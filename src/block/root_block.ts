import type {Branch, Block, TagBlock, BlockReport, InitializationResponse, RenderDescription } from "../types"
import * as HTML from "../html"
import FilterContext from "../filter_context"
import BlockCollection from "./block_collection"
import {Ok} from "../utils"


export default
class RootBlock implements Block {

	private constructor() {}

	_children: BlockCollection|undefined
	get children() {
		if (! this._children) {
			throw Error(`children accessed before initialization`)
		} else {
			return this._children
		}
	}

	setChildren(children:BlockCollection) {
		this._children = children
	}

	static Init(children:HTML.Element[]): InitializationResponse<RootBlock> {
		const block = new RootBlock()

		const childrenResult = BlockCollection.Create(children, block)
		if (! childrenResult.ok) {
			return childrenResult
		}

		block.setChildren(childrenResult.result)

		const consumerResponse = block.checkConsumers()
		if (! consumerResponse.ok) {
			return consumerResponse
		}

		return Ok(block)
	}

	setParent() {
		throw Error(`Cannot set the parent of a root block`)
	}

	isDynamic() {
		// Always assume dynamic
		return true
	}

	mkError(message:string) {
		return {
			message,
			filename: "<root>",
			linenumber: 0,
			tag: "<root_block>"
		}
	}

	report(): BlockReport {
		return this.children.aggReport()
	}

	checkConsumers(): InitializationResponse<void> {
		return this.children.checkAllConsumer([], [])
	}

	Find(check:(el:TagBlock) => boolean): TagBlock|undefined {
		return this.children.findInChildren(check)
	}

	FindAll(check:(el:TagBlock) => boolean): TagBlock[] {
		return this.FindChildren(check)
	}

	FindChildren(check:(el:TagBlock) => boolean): TagBlock[] {
		return this.children.findAllInChildren(check)
	}

	Render(ctx:FilterContext): Promise<Branch> {
		return this.children.renderAll(ctx)
	}

	RenderConstant(): HTML.Element {
		throw Error(`RootBlock cannot render constant`)
	}

	getName() {
		return "<root>"
	}

	getPath() {
		return []
	}

	CheckPreceeds(ctx:FilterContext) {
		// Root blocks do not alter the ctx
		return Promise.resolve(ctx)
	}

	getRenderDescription(): RenderDescription[] {
		return this.children.getRenderDescription()
	}

	Isolate() {
		const run = async (ctx:FilterContext) => {
			const renderOutput = await this.Render(ctx)
			return { found:true, ...renderOutput }
		}

		return { run, globals:[] }
	}

	createChildChain(seq:number, consumes:string[]) {
		// Just create and execute the preceed chain assuming it was found.
		const preceedChain = this.children.createContainerChain(seq, consumes)
		const run = (initCtx:FilterContext) => preceedChain.collection.runPreceed(initCtx)
			.then((ctx) => ({ ctx, found:true }))
		return { run, globals:[] }

	}

	findAncestor(): TagBlock|undefined {
		return undefined
	}
}


