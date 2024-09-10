import type {Branch, Block, TagBlock, BlockReport, RenderDescription } from "../types"
import * as HTML from "../html"
import FilterContext from "../filter_context"
import BlockCollection from "./block_collection"


export default
class RootBlock implements Block {

	public children: BlockCollection

	constructor(children:HTML.Element[]) {
		this.children = BlockCollection.Create(children, this)
		this.checkConsumers()
	}

	isDynamic() {
		// Always assume dynamic
		return true
	}

	error(msg:string): never {
		throw Error(msg)
	}

	report(): BlockReport {
		return this.children.aggReport()
	}

	checkConsumers() {
		this.children.checkAllConsumer([])
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

	getName() {
		return "<root>"
	}

	getPath() {
		return []
	}

	CheckContains(ctx:FilterContext) {
		// Root blocks do not alter the ctx or remove display
		return Promise.resolve({ ctx, found:true })
	}


	CheckPreceeds(ctx:FilterContext) {
		// Root blocks do not alter the ctx
		return Promise.resolve(ctx)
	}

	getRenderDescription(): RenderDescription[] {
		return this.children.getRenderDescription()
	}

	getAllConsumes() {
		return []
	}

	resolveChildConsumes(seq:number, consumes:string[]) {
		return this.children.getAllConsumesForChild(seq, consumes)
	}

	Isolate() {
		return async (ctx:FilterContext) => {
			const renderOutput = await this.Render(ctx)
			return { found:true, ...renderOutput }
		}
	}

	createChildChain() {
		return (ctx:FilterContext) => Promise.resolve({ found:true, ctx })
	}

	findAncestor(): TagBlock|undefined {
		return undefined
	}
}

