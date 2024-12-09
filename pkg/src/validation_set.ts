import type {TagBlock, InitializationFailure, InitializationResponse, ValidationError} from "./types"

// 
// This is a utility class used for collecting validation errors
// and returning the appropriate response.
//

export default
class ValidationSet {
	private errors: ValidationError[] = []

	constructor(private block:TagBlock) {}

	get isOk(): boolean {
		return !this.errors.length
	}

	error(message:string) {
		const error = this.block.mkError(message)
		this.errors.push(error)
		return this
	}

	Fail(): InitializationFailure {
		return { ok:false, errors:this.errors }
	}

	Fatal(message:string): InitializationFailure {
		return this.error(message).Fail()
	}

	AddResult(res:InitializationResponse<unknown>) {
		if (!res.ok) {
			this.errors.push(...res.errors)
		}
	}

	ResultAs<T>(result:T): InitializationResponse<T> {
		if (this.isOk) {
			return { ok:true, result }
		} else {
			return this.Fail()
		}
	}

	Result(): InitializationResponse<void> {
		return this.ResultAs(undefined)
	}
	
}
