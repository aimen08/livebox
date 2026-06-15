#!/usr/bin/env node
// Stage the macOS embedded-mpv runtime for packaging.
//
// Copies the built native addon (embedded_mpv.node) plus the WHOLE libmpv
// dependency tree (ffmpeg, libass, libplacebo, …) into native/runtime/ — FLAT,
// addon and dylibs side by side — rewriting every install-name to @loader_path/<name>
// so the bundled .app is self-contained and needs no Homebrew on the user's
// machine. Flat (not a lib/ subdir) is required: @loader_path is relative to each
// binary, so a nested prefix would make the dylibs look for each other one level
// too deep. electron-builder ships native/runtime/ → Contents/Resources/native/.
//
// Requires `dylibbundler` (brew install dylibbundler). Run after `npm run build:native`.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const addon = resolve(root, "native/build/Release/embedded_mpv.node");
const runtime = resolve(root, "native/runtime");
const libDir = runtime; // FLAT: addon + dylibs together (see header note)
const stagedAddon = resolve(runtime, "embedded_mpv.node");

function fail(msg) { console.error(`\n[stage-mpv-mac] ${msg}\n`); process.exit(1); }

if (process.platform !== "darwin") fail("macOS only.");
if (!existsSync(addon)) fail("native/build/Release/embedded_mpv.node not found — run `npm run build:native` first.");
try { execFileSync("which", ["dylibbundler"], { stdio: "ignore" }); }
catch { fail("dylibbundler not found — install it with `brew install dylibbundler`, then re-run."); }

rmSync(runtime, { recursive: true, force: true });
mkdirSync(libDir, { recursive: true });
copyFileSync(addon, stagedAddon);

console.log("[stage-mpv-mac] bundling libmpv + dependency tree …");
// -of overwrite, -cd create dest dir, -b bundle deps, -x target binary,
// -d dest lib dir, -p the @loader_path prefix the binary will resolve from.
execFileSync("dylibbundler", [
  "-of", "-cd", "-b",
  "-x", stagedAddon,
  "-d", libDir,
  "-p", "@loader_path",
], { stdio: "inherit" });

console.log(`[stage-mpv-mac] done → ${runtime} (addon + dylibs, flat). Verify with:`);
console.log(`  otool -L "${stagedAddon}" | grep -i mpv   # should read @loader_path/libmpv.2.dylib`);
