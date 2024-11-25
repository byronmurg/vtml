
// This is a utility class to figure out the line number in a string given only
// the indent. It does so by building a length map of all lines.

export default
class LineMap {
	constructor(
		private m: number[]
	) {}

	static FromString(str:string) {
		const map = str.split("\n").map((v) => v.length +1)
		return new LineMap(map)
	}

	GetLine(indent:number) {
		let lineno = 1
		let i = indent
		for (const ind of this.m) {
			if (ind >= i) {
				return lineno
			} else {
				lineno += 1
				i -= ind
			}
		}
		throw Error(`Indent out of bounds ${indent} line:${lineno}`)
	}
}
