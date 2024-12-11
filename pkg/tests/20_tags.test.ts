import {RenderTest, RenderErrors, InitDocument, InitCtx, trimAll} from "./test_lib"

test("Unknown tags throw an error", () => {
	const exampleHTML = `<v-dunnome/>`

	const errors = RenderErrors(exampleHTML)

	expect(errors).toEqual([
		{
			message: "Unknown VTML tag",
			tag: "v-dunnome",
			filename: "<string>",
			linenumber: 1,
		}
	])
})

///////////////////////////
// v-with
///////////////////////////

describe("v-with", () => {
	test("renders when truthy", async () => {
		const output = await RenderTest(`
			<v-json target="$numbers" >
				{ "one":1 }
			</v-json>
			<v-with source="$numbers.one" as="$one" >
				<p>Hello</p>
			</v-with>
		`)
		expect(output).toBe(`<p>Hello</p>`)
	})

	test("renders when falsy", async () => {
		const output = await RenderTest(`
			<v-json target="$numbers" >
				{ "zero":0 }
			</v-json>
			<v-with source="$numbers.zero" as="$zero" >
				<p>Hello</p>
			</v-with>
		`)
		expect(output).toBe(`<p>Hello</p>`)
	})

	test("does not render when undefined", async () => {
		const output = await RenderTest(`
			<v-json target="$numbers" >
				{ "zero":0 }
			</v-json>
			<v-with source="$numbers.one" as="$zero" >
				<p>Hello</p>
			</v-with>
		`)
		expect(output).toBe(``)
	})

	test("does not render when null", async () => {
		const output = await RenderTest(`
			<v-json target="$numbers" >
				{ "eleventeen":null }
			</v-json>
			<v-with source="$numbers.eleventeen" as="$el" >
				<p>Hello $el</p>
			</v-with>
		`)
		expect(output).toBe(``)
	})

	test("renders inject variable when defined", async () => {
		const output = await RenderTest(`
			<v-json target="$numbers" >
				{ "zero":0 }
			</v-json>
			<v-with source="$numbers.zero" as="$zero" >
				<p>$zero</p>
			</v-with>
		`)
		expect(output).toBe(`<p>0</p>`)
	})
})

///////////////////////////
// v-hint-port
///////////////////////////


test("v-hint-port", async () => {

	const exampleHTML = `
		<v-hint-port port="1337" />
	`

	const doc = InitDocument(exampleHTML)

	const port = await doc.findHint("v-hint-port", "port")

	expect(port).toBe(`1337`)
})

describe("v-if", () => {

	async function testIf(tag:string) {
		const exampleHTML = `
			<v-json target="$var" >
				22
			</v-json>

			${tag}
		`

		const doc = InitDocument(exampleHTML)
		const ctx = InitCtx()

		return trimAll(await doc.renderLoaderMl(ctx))
	}

	test("render contents when truthy", async () => {
		const truthyOut = await testIf(`
			<v-if source="$var" >truthy</v-if>
		`)
		expect(truthyOut).toBe(`truthy`)
	})

	test("render contents when equal", async () => {
		const eqOut = await testIf(`
			<v-if source="$var" eq="22" >true</v-if>
		`)
		expect(eqOut).toBe(`true`)
	})


	test("render contents when greater than or equal", async () => {
		const gteOut = await testIf(`
			<v-if source="$var" gte="22" >true</v-if>
		`)
		expect(gteOut).toBe(`true`)
	})


	test("render multiple", async () => {
		const allOut = await testIf(`
			<v-if source="$var" eq="22" >
				(eq 22)
			</v-if>
			<v-if source="$var" gt="10" >
				(gt 10)
			</v-if>
			<v-if source="$var" lt="100" >
				(lt 100)
			</v-if>
		`)

		expect(allOut).toBe("(eq 22)(gt 10)(lt 100)")
	})

	test("render when every selector matches", async () => {
		const everyOut = await testIf(`
			<v-if source="$var" eq="22" gt="10" lt="100" >
				Every selector matches
			</v-if>
		`)
		expect(everyOut).toBe("Every selector matches")
	})

	test("do not render when one doesn't match", async () => {
		const oneNotOut = await testIf(`
			<v-if source="$var" eq="22" gt="10" lte="10" >
				One doesn't match
			</v-if>
		`)
		expect(oneNotOut).toBe("")
	})

})


test("v-unless", async () => {

	const exampleHTML = `
		<v-json target="$foo" >"bar"</v-json>
		<v-unless source="$foo" eq="bar" >
			Shouldn't see me
		</v-unless>
	`

	const output = await RenderTest(exampleHTML)

	expect(output).toBe("")
})

test("v-for-each", async () => {

	const exampleHTML = `
		<v-json target="$vars" >
			[
				"foo", "bar"
			]
		</v-json>

		<v-for-each source="$vars" as="$var">
			<p>$var</p>
		</v-for-each>
	`

	const output = await RenderTest(exampleHTML)

	expect(output).toBe(`<p>foo</p><p>bar</p>`)
})

test("v-dump", async () => {
	const exampleHTML = `
		<v-json target="$foo" >"bar"</v-json>
		<v-dump source="$foo" />
	`

	const output = await RenderTest(exampleHTML)

	expect(output).toBe(`<pre>"bar"</pre>`)
})

test("v-page", async () => {
	const exampleHTML = `
		<v-page path="/foo" >
			Foo
		</v-page>
		<v-page path="/bar" >
			Bar
		</v-page>
	`

	const fooCtx = {
		path: "/foo",
		matchedPath: "/foo",
	}

	const fooOut = await RenderTest(exampleHTML, fooCtx)

	expect(fooOut).toBe(`Foo`)
})

test(`select`, async () => {
	const exampleHTML = `
		<v-json target="$foo" >"foo"</v-json>
		<select name="foo_test" value="$foo" >
			<option>foo</option>
			<option>bar</option>
		</select>
	`

	const output = await RenderTest(exampleHTML)

	expect(output).toBe(`<select name="foo_test" value="foo"><option selected="yes">foo</option><option>bar</option></select>`)
})

test(`v-set-status`, async () => {
	const exampleHTML = `
		<v-set-status code="403" />
	`

	const doc = InitDocument(exampleHTML)
	const ctx = InitCtx()

	const res = await doc.renderDocument(ctx)

	expect(res.status).toBe(403)
})

test("v-markdown", async () => {
	const output = await RenderTest(`<v-markdown src="tests/test_assets/markdown.md">`)

	expect(output).toBe(`<h1>title</h1><p>text</p>`)
})

test("v-fs-readdir", async () => {
	const output = await RenderTest(`
		<v-fs-readdir target="$dir" path="tests/test_assets" />
		<v-dump source="$dir" />
	`)

	expect(output).toMatch(`markdown.md`)
})

test(`v-expose`, async () => {
	const html = `
		<v-expose path="/foo" src="./bar" >
			Hello
		</v-expose>
	`

	const errors = RenderErrors(html)

	expect(errors).toEqual([
		{
			message: `Must not have body`,
			tag: "v-expose",
			filename: "<string>",
			linenumber: 2
		}
	])
})
