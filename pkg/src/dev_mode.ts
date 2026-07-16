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
	ps.on("error", (err) => console.error("Failed to start process:", err))
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

	const watcher = watch(dir, { persistent:true, recursive:true }, shouldRestart)
	// e.g. ENOSPC from hitting the OS's inotify watch limit - an unhandled
	// "error" here would otherwise crash the whole dev server.
	watcher.on("error", (err) => console.error("Watch error:", err))
}
