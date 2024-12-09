import {InitRootBlock} from "./test_lib"

describe("inbuilt tags", () => {

	test("Inbuilt tag structures are always static", async () => {
		const exampleVtml = `
			<div>
				<p>Hi</p>
			</div>
		`
		const rootDoc = InitRootBlock(exampleVtml)
		const div = rootDoc.Find((bl) => bl.getName() === "div")
		expect(div).toBeDefined()

		expect(div?.isDynamic()).toBe(false)

	})

	test("Inbuilt tags containing vtml tags are not static", async () => {
		const exampleVtml = `
			<div>
				<v-dump source="$.path" />
			</div>
		`
		const rootDoc = InitRootBlock(exampleVtml)
		const div = rootDoc.Find((bl) => bl.getName() === "div")
		expect(div).toBeDefined()

		expect(div?.isDynamic()).toBe(true)
	})

	test("Inbuilt tags that reference variables are not static", async () => {
		const exampleVtml = `
			<div>
				<p>$.path</p>
			</div>
		`
		const rootDoc = InitRootBlock(exampleVtml)
		const div = rootDoc.Find((bl) => bl.getName() === "div")
		expect(div).toBeDefined()

		expect(div?.isDynamic()).toBe(true)
	})
})
