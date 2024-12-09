import {RenderTestFile} from "./test_lib"

test("v-include", async () => {

	const output = await RenderTestFile("./tests/test_assets/parent.html")

	expect(output).toBe(`<p>22</p>`)
})
