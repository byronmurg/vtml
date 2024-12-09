import type {TagBlock, InitializationFailure, ValidationError} from "./types"

// A utility class for checking that provided path endpoints are unique within a vtml document

export default
class PathMap {
	private paths: Record<string, TagBlock> = {}
	private errors: ValidationError[] = []

	check(block:TagBlock, path:string) {
		const existing = this.paths[path]

		if (existing) {
			this.errors.push(
				existing.mkError(`Duplicate path ${path}`),
				block.mkError(`Duplicate path ${path}`),
			)
		} else {
			this.paths[path] = block
		}
	}

	get ok() {
		return !this.errors.length
	}

	Fail(): InitializationFailure {
		return { ok:false, errors:this.errors }
	}
}

