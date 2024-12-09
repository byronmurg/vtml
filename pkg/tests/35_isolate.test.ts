import {InitCtx, InitRootBlock, InitDocument} from "./test_lib"

describe("v-portal", () => {
	const exampleVtml = `
		<v-json target="$foo" >22</v-json>

		<p>before</p>

		<v-portal path="/test_portal" >
			<p>$foo</p>
		</v-portal>
	`
	const doc = InitDocument(exampleVtml)

	test("portals pass through", async () => {
		const ctx = InitCtx()
		const output = await doc.renderLoaderMl(ctx)

		expect(output).toBe(`<p>before</p><p>22</p>`)
	})

	test("portals can be isolated", async () => {
		const rootDoc = InitRootBlock(exampleVtml)
		const portal = rootDoc.Find((bl) => bl.getName() === "v-portal")
		expect(portal).toBeDefined()

		const isolate = portal?.Isolate()
		expect(isolate).toBeDefined()

		if (isolate === undefined) {
			throw Error(`Isolate undefined`)
		}
		const output = await isolate.run(InitCtx())

		expect(output.found).toBe(true)

		expect(output.ctx.GetReturnCode()).toBe(200)

		expect(output.elements.length).toBe(1)

		expect(output.elements[0]).toEqual({
			type: "element",
			name: "p",
			attributes: {},
			filename: "<test_string>",
			linenumber: 7,
			elements: [
				{
					type: "text",
					text: "22",
					filename: "<test_string>",
					linenumber: 7,
				}
			],
		})

	})
})

describe("inbuilt isolate", () => {
	const exampleVtml = `
		<v-json target="$foo" >22</v-json>

		<p>before</p>

		<div>
			<p>$foo</p>
		</div>
	`
	const doc = InitDocument(exampleVtml)

	test("inbuilts render normally", async () => {
		const ctx = InitCtx()
		const output = await doc.renderLoaderMl(ctx)

		expect(output).toBe(`<p>before</p><div><p>22</p></div>`)
	})

	test("inbuilts can be isolated", async () => {
		const rootDoc = InitRootBlock(exampleVtml)
		const portal = rootDoc.Find((bl) => bl.getName() === "div")
		expect(portal).toBeDefined()

		const isolate = portal?.Isolate()
		expect(isolate).toBeDefined()

		if (isolate === undefined) {
			throw Error(`Isolate undefined`)
		}
		const output = await isolate.run(InitCtx())

		expect(output.found).toBe(true)

		expect(output.ctx.GetReturnCode()).toBe(200)

		expect(output.elements.length).toBe(1)

		expect(output.elements[0]).toEqual({
			type: "element",
			name: "div",
			attributes: {},
			filename: "<test_string>",
			linenumber: 6,
			elements: [
				{
				type: "element",
				name: "p",
				attributes: {},
				filename: "<test_string>",
				linenumber: 7,
				elements: [
					{
						type: "text",
						text: "22",
						linenumber: 7,
						filename: "<test_string>",
					}
				]
				}
			],
		})

	})
})
