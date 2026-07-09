import Multer from "multer"
import {getErrorStatus} from "../src/web/web_utils"

test("unexpected errors fall back to 500", () => {
	expect(getErrorStatus(new Error("boom"))).toBe(500)
})

test("errors with a valid status are respected", () => {
	const err = Object.assign(new Error("bad json"), { status:400 })
	expect(getErrorStatus(err)).toBe(400)
})

test("errors with a valid statusCode are respected", () => {
	const err = Object.assign(new Error("too big"), { statusCode:413 })
	expect(getErrorStatus(err)).toBe(413)
})

test("out of range status codes are ignored", () => {
	const err = Object.assign(new Error("weird"), { status:999 })
	expect(getErrorStatus(err)).toBe(500)
})

test("multer errors are treated as bad requests", () => {
	const err = new Multer.MulterError("LIMIT_FILE_SIZE")
	expect(getErrorStatus(err)).toBe(400)
})
