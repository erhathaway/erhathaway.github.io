// Builds in a staging directory, one build at a time, and swaps in the result only on success.
//
// `wrangler dev` starts a new build per changed file without stopping the previous one, bundles the
// output in place, and exits on any failure. Building directly in `.svelte-kit` therefore crashes it:
// parallel builds race (ENOTEMPTY), and a build that empties `output` breaks a bundle in progress.
//
// Callers queue on a lock. A caller skips its build if another build started after its request and
// succeeded, since that build already saw the caller's changes.
//
// With BUILD_KEEP_ALIVE=1 (dev servers), a failed build exits 0 so wrangler keeps serving the last
// good output, which a failed build never touches.
import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, statSync, writeFileSync, writeSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = '.svelte-kit';
const LOCK = `${ROOT}/.build-lock`;
const STAMP = `${ROOT}/.build-stamp`;
const STAGE = `${ROOT}/.stage`;
const RETIRED = `${ROOT}/.retired`;
const PUBLISHED_DIRS = ['output', 'cloudflare-tmp', 'cloudflare'];
const POLL_MS = 100;
const UNWRITTEN_LOCK_GRACE_MS = 5000;

const read = (path) => {
	try {
		return readFileSync(path, 'utf8').trim();
	} catch {
		return '';
	}
};

function isLockStale() {
	const pid = Number(read(LOCK));
	if (!pid) {
		// The holder creates the file and then writes its pid, so an empty lock is usually brand new.
		try {
			return Date.now() - statSync(LOCK).mtimeMs > UNWRITTEN_LOCK_GRACE_MS;
		} catch {
			return false;
		}
	}
	try {
		process.kill(pid, 0);
		return false;
	} catch (error) {
		return error.code === 'ESRCH';
	}
}

async function acquireLock() {
	mkdirSync(ROOT, { recursive: true });
	for (;;) {
		try {
			const fd = openSync(LOCK, 'wx');
			writeSync(fd, String(process.pid));
			closeSync(fd);
			return;
		} catch (error) {
			if (error.code !== 'EEXIST') throw error;
		}
		if (isLockStale()) rmSync(LOCK, { force: true });
		else await sleep(POLL_MS);
	}
}

// The adapter takes its output paths from the wrangler config, so staging needs its own copy.
function writeStageWranglerConfig() {
	const source = readFileSync('wrangler.toml', 'utf8');
	const staged = source
		.replace('main = ".svelte-kit/cloudflare/_worker.js"', 'main = "cloudflare/_worker.js"')
		.replace('directory = ".svelte-kit/cloudflare"', 'directory = "cloudflare"');
	if (staged.includes('.svelte-kit/cloudflare')) {
		throw new Error('wrangler.toml has an output path that build-serial.mjs does not rewrite.');
	}
	writeFileSync(`${STAGE}/wrangler.toml`, staged);
}

function viteBuild() {
	return new Promise((resolve) => {
		const child = spawn('node_modules/.bin/vite', ['build'], {
			stdio: 'inherit',
			env: { ...process.env, BUILD_OUT_DIR: STAGE }
		});
		child.on('error', (error) => {
			console.error(error);
			resolve(1);
		});
		child.on('close', (code) => resolve(code ?? 1));
	});
}

function publishStage() {
	rmSync(RETIRED, { recursive: true, force: true });
	mkdirSync(RETIRED);
	for (const dir of PUBLISHED_DIRS) {
		if (existsSync(`${ROOT}/${dir}`)) renameSync(`${ROOT}/${dir}`, `${RETIRED}/${dir}`);
		renameSync(`${STAGE}/${dir}`, `${ROOT}/${dir}`);
	}
	rmSync(RETIRED, { recursive: true, force: true });
}

const requestedAt = Date.now();
await acquireLock();

let exitCode = 0;
try {
	if (Number(read(STAMP)) > requestedAt) {
		console.log('[build] Skipped: a newer build already includes these changes.');
	} else {
		const startedAt = Date.now();
		rmSync(STAGE, { recursive: true, force: true });
		mkdirSync(STAGE);
		writeStageWranglerConfig();
		exitCode = await viteBuild();
		if (exitCode === 0) {
			publishStage();
			writeFileSync(STAMP, String(startedAt));
		}
	}
} finally {
	rmSync(LOCK, { force: true });
}

if (exitCode !== 0 && process.env.BUILD_KEEP_ALIVE === '1') {
	console.error('[build] Build failed. Still serving the last good build; fix the error and save again.');
	exitCode = 0;
}
process.exit(exitCode);
