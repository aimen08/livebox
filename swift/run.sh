#!/bin/bash
# SPM doesn't lay out dynamic xcframeworks where @loader_path/../Frameworks
# expects them, so `swift run` fails with a dyld "Library not loaded" error
# for VLCKit. Symlink the framework into the expected spot, then run.
set -e
cd "$(dirname "$0")"

swift build "$@"

arch=$(uname -m)
triple="${arch}-apple-macosx"
debug_dir=".build/${triple}/debug"
frameworks_dir=".build/${triple}/Frameworks"

if [ ! -d "${debug_dir}" ]; then
    echo "Build output not found at ${debug_dir}" >&2
    exit 1
fi

mkdir -p "${frameworks_dir}"
ln -sfn "../debug/VLCKit.framework" "${frameworks_dir}/VLCKit.framework"

exec "${debug_dir}/LiveBox"
