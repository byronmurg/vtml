import StarlingDocument from "../src/document"
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
	pageNotFound: false,
})

test("x-nodejs basic", async () => {

	const exampleHTML = `
		<x-nodejs target="foo" >
			const v = 2 * 3 * 4
			return v
		</x-nodejs>

		<p>$foo</p>
	`

	const doc = StarlingDocument.LoadFromString(exampleHTML)

	const output = await doc.renderLoaderMl(ctx)

	expect(output).toBe(`<p>24</p>`)
})

test("x-nodejs binding", async () => {

	const exampleHTML = `
		<x-json target="number" >
			3
		</x-json>

		<x-nodejs target="foo" >
			const v = 2 * $number * 4
			return v
		</x-nodejs>

		<p>$foo</p>
	`

	const doc = StarlingDocument.LoadFromString(exampleHTML)

	const output = await doc.renderLoaderMl(ctx)

	expect(output).toBe(`<p>24</p>`)
})

test("x-nodejs invalid", async () => {
	expect.assertions(1)

	const exampleHTML = `
		<x-nodejs target="foo" >
			retur 3
		</x-nodejs>

		<p>$foo</p>
	`

	try {
		const doc = StarlingDocument.LoadFromString(exampleHTML)
		await doc.renderLoaderMl(ctx)
	} catch (e:any) {
		expect(e.message).toMatch(`Syntax error in x-node : Unexpected number`)
	}
})

test("x-nodejs throw", async () => {
	expect.assertions(1)

	const exampleHTML = `
		<x-nodejs target="foo" >
			throw Error("See me")
		</x-nodejs>

		<p>$foo</p>
	`

	try {
		const doc = StarlingDocument.LoadFromString(exampleHTML)
		await doc.renderLoaderMl(ctx)
	} catch (e:any) {
		expect(e.message).toMatch(`Error in x-node : See me`)
	}
})

test("x-nodejs throw with id", async () => {
	expect.assertions(1)

	const exampleHTML = `
		<x-nodejs target="foo" id="seeme" >
			throw Error("See me")
		</x-nodejs>

		<p>$foo</p>
	`

	try {
		const doc = StarlingDocument.LoadFromString(exampleHTML)
		await doc.renderLoaderMl(ctx)
	} catch (e:any) {
		expect(e.message).toMatch(`Error in x-node (id seeme): See me`)
	}
})
