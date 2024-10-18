#!/bin/bash
set -euo pipefail

# This is the base single-file-executable script for VTML. It exists because the SQLite package and
# the PKG bundler must match both platform and architecture, but both use different names for each.
#
# This script can be invoked like:
#   ./release.sh linux x86
#   ./release.sh darwin arm64

die() {
	echo $@ >&2
	exit 1
}

pkg_os() {
	name=${1,,}
	case $name in
		linux)
			echo "linux";;
		win | windows)
			echo "win";;
		mac | macos | darwin)
			echo "darwin";;
		*)
			die "Unknown os $name";;
	esac
}

prebuild_os() {
	name=${1,,}
	case $name in
		linux)
			echo "linux";;
		win | windows)
			echo "win32";;
		mac | macos | darwin)
			echo "darwin";;
		*)
			die "Unknown os $name";;
	esac
}

pkg_arch() {
	name=${1,,}
	case $name in
		x86 | x86_64 | x64 | amd64)
			echo "x86_64";;
		arm64 | arm)
			echo "arm64";;
		*)
			die "Unknown arch $name";;
	esac
}

prebuild_arch() {
	name=${1,,}
	case $name in
		x86 | x86_64 | x64 | amd64)
			echo "x64";;
		arm64 | arm)
			echo "arm64";;
		*)
			die "Unknown arch $name";;
	esac
}

OS=${1:-$(uname)}
PREBUILD_OS=$(prebuild_os $OS)
PKG_OS=$(pkg_os $OS)
ARCH=${2:-$(uname -m)}
PKG_ARCH=$(pkg_arch $ARCH)
PREBUILD_ARCH=$(prebuild_arch $ARCH)

cd node_modules/sqlite3
../.bin/prebuild-install -r napi --arch $PREBUILD_ARCH --platform $PREBUILD_OS --verbose
cd -

REL_PATH=release/vtml-$PKG_OS-$PKG_ARCH
mkdir -p $REL_PATH

echo "Don't worry about the require error message that's just where v-nodejs imports at runtime"
npx @yao-pkg/pkg --compress GZip -t node22-$PKG_OS-$PREBUILD_ARCH -o $REL_PATH/vtml package.json --public

