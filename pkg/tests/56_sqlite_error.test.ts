import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { URL } from "node:url"
import sqliteInterface from "../src/sql/sqlite"

function createTempDb(): string {
	const file = path.join(os.tmpdir(), `vtml-test-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`)
	// An empty file is a valid, fresh sqlite database.
	fs.writeFileSync(file, "")
	return file
}

test("a query against a missing table rejects instead of emitting an unhandled error event", async () => {
	const file = createTempDb()

	try {
		const sql = sqliteInterface(new URL(`sqlite://${file}`))

		await expect(sql.query("SELECT * FROM this_table_does_not_exist", []))
			.rejects.toThrow(/no such table/)
	} finally {
		fs.unlinkSync(file)
	}
})
