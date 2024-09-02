import VtmlDocument from "../src/document"
import FilterContext from "../src/filter_context"

// Just an example context
const ctx = FilterContext.Init({
	path: "/",
	matchedPath: "/",
	query: {},
	method: "GET",
	cookies: {},
	headers: {},
	params:{},
})

test("v-nodejs basic", async () => {

	const exampleHTML = `
		<v-nodejs target="foo" >
			const v = 2 * 3 * 4
			return v
		</v-nodejs>

		<p>$foo</p>
	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const output = await doc.renderLoaderMl(ctx)

	expect(output).toBe(`<p>24</p>`)
})

test("v-nodejs binding", async () => {

	const exampleHTML = `
		<v-json target="number" >
			3
		</v-json>

		<v-nodejs target="foo" >
			const v = 2 * $number * 4
			return v
		</v-nodejs>

		<p>$foo</p>
	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)

	const output = await doc.renderLoaderMl(ctx)

	expect(output).toBe(`<p>24</p>`)
})

test("v-nodejs invalid", async () => {
	expect.assertions(1)

	const exampleHTML = `
		<v-nodejs target="foo" >
			retur 3
		</v-nodejs>

		<p>$foo</p>
	`

	try {
		const doc = VtmlDocument.LoadFromString(exampleHTML)
		await doc.renderLoaderMl(ctx)
	} catch (err) {
		const e = err as Error
		expect(e.message).toMatch(`Syntax error in v-node : Unexpected number`)
	}
})

test("v-nodejs throw", async () => {
	const exampleHTML = `
		<v-nodejs target="foo" >
			throw Error("See me")
		</v-nodejs>

		<p>$foo</p>
	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)
	const res = await doc.renderDocument(ctx)
	expect(res.error).toMatch(`Error in v-node : See me`)
})

test("v-nodejs throw with id", async () => {
	expect.assertions(1)

	const exampleHTML = `
		<v-nodejs target="foo" id="seeme" >
			throw Error("See me")
		</v-nodejs>

		<p>$foo</p>
	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)
	const res = await doc.renderDocument(ctx)
	expect(res.error).toMatch(`Error in v-node (id seeme): See me`)
})
