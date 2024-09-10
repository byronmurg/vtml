import VtmlDocument from "../src/document"
import {InitCtx} from "./test_lib"

test("error is set", async () => {
	const ctx = InitCtx()
	const exampleHTML = `
		<v-try>
			<v-nodejs>throw Error("Hi")</v-nodejs>
		</v-try>
		<v-catch>
			<p>$error.message</p>
		</v-catch>
	`

	const doc = VtmlDocument.LoadFromString(exampleHTML)
	const res = await doc.renderLoaderMl(ctx)

	expect(res).toBe("<p>Internal Server Error</p>")
})
