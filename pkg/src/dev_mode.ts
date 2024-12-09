import { watch } from 'node:fs'
import path from "node:path"
import {spawn} from "node:child_process"

function mkProcess() {
	const argv = process.argv.filter((f) => f !== "--dev")

	const [cmd, ...args] = argv
	return spawn(cmd, args)
}

function start() {
	const ps = mkProcess()
	ps.stdout.on("data", (d) => console.log(d.toString()))
	ps.stderr.on("data", (d) => console.log(d.toString()))
	return ps
}

export default 
async function DevMode(file:string) {
	console.log("Run in dev mode")
	const dir = path.dirname(file)

	let timer:ReturnType<typeof setTimeout>
	let ps = start()

	function restartProcess() {
		ps.kill()
		ps = start()
	}

	function shouldRestart() {
		clearTimeout(timer)
		timer = setTimeout(restartProcess, 50)
	}

	watch(dir, { persistent:true, recursive:true }, shouldRestart)
} 
