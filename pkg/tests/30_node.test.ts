import {RenderTest, RenderErrors} from "./test_lib"

test("v-nodejs basic", async () => {

	const exampleHTML = `
		<v-nodejs target="$foo" >
			const v = 2 * 3 * 4
			return v
		</v-nodejs>

		<p>$foo</p>
	`

	const output = await RenderTest(exampleHTML)

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

	const output = await RenderTest(exampleHTML)

	expect(output).toBe(`<p>24</p>`)
})

test("v-nodejs complex binding", async () => {

	const exampleHTML = `
		<v-json target="$foo" >
			{ "bar":22 }
		</v-json>
		<v-json target="$bar" >
			"bar"
		</v-json>

		<v-nodejs target="$out" >
			return $foo[$bar]
		</v-nodejs>

		<p>$out</p>
	`

	const output = await RenderTest(exampleHTML)

	expect(output).toBe(`<p>22</p>`)
})


test("v-nodejs invalid", () => {
	expect.assertions(1)

	const exampleHTML = `
		<v-nodejs target="$foo" >
			retur 3
		</v-nodejs>

		<p>$foo</p>
	`

	const errors = RenderErrors(exampleHTML)

	expect(errors).toEqual([
		{
			message: "Syntax error in v-node: Unexpected number",
			filename: "<string>",
			linenumber: 2,
			tag: "v-nodejs",
		}
	])
})

test("v-nodejs throw", async () => {
	const exampleHTML = `
		<v-nodejs target="$foo" >
			throw Error("See me")
		</v-nodejs>

		<p>$foo</p>
	`
	try {
		await RenderTest(exampleHTML)
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
		await RenderTest(exampleHTML)
	} catch (err) {
		const e = err as Error
		expect(e.message).toMatch(`Error in v-node: See me`)
	}
})
