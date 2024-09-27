import VtmlDocument from "../src/document"
import {InitCtx} from "./test_lib"

// Just an example context
const ctx = InitCtx()

test("v-nodejs basic", async () => {

	const exampleHTML = `
		<v-nodejs target="$foo" >
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
		<v-json target="$number" >
			3
		</v-json>

		<v-nodejs target="$foo" >
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
		<v-nodejs target="$foo" >
			retur 3
		</v-nodejs>

		<p>$foo</p>
	`

	try {
		const doc = VtmlDocument.LoadFromString(exampleHTML)
		await doc.renderLoaderMl(ctx)
	} catch (err) {
		const e = err as Error
		expect(e.message).toMatch(/^Syntax error in v-node/)
	}
})

test("v-nodejs throw", async () => {
	const exampleHTML = `
		<v-nodejs target="$foo" >
			throw Error("See me")
		</v-nodejs>

		<p>$foo</p>
	`
	try {
		const doc = VtmlDocument.LoadFromString(exampleHTML)
		await doc.renderDocument(ctx)
	} catch (err) {
		const e = err as Error
		expect(e.message).toMatch(`Error in v-node: See me`)
	}
})

test("v-nodejs multiple throw", async () => {
	const exampleHTML = `
		<v-nodejs target="$foo" >
			throw Error("See me")
		</v-nodejs>

		<v-nodejs target="$bar" >
			throw Error("not me")
		</v-nodejs>

		<p>$foo $bar</p>
	`
	try {
		const doc = VtmlDocument.LoadFromString(exampleHTML)
		await doc.renderDocument(ctx)
	} catch (err) {
		const e = err as Error
		expect(e.message).toMatch(`Error in v-node: See me`)
	}
})
