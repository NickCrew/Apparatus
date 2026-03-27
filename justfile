# Apparatus monorepo

set dotenv-load := false

default:
    @just --list

# ── Build ────────────────────────────────────────────────────

# Build all packages
build:
    pnpm nx run-many -t build

# Build a single package
build-pkg pkg:
    pnpm nx run {{pkg}}:build

# ── Dev ──────────────────────────────────────────────────────

# Start the apparatus server (HTTP/1 :8090, HTTP/2 :8443, etc.)
dev:
    pnpm nx run apparatus:dev

# Start the CLI in watch mode
dev-cli:
    pnpm nx run cli:dev

# Start the TUI terminal dashboard
tui:
    cd apps/apparatus && pnpm run tui

# Open the web dashboard
dashboard:
    open http://localhost:8090/dashboard

# Start the REPL
repl:
    cd apps/cli && pnpm start repl

# Start live-reload dev stack in tmux via tx (session defaults to "aps")
aps-dev-up session="aps":
	#!/usr/bin/env bash
	set -euo pipefail
	if ! TMUX_SESSION={{session}} tx list | grep -Eq '^[0-9]+: server-dev( |$)'; then
	TMUX_SESSION={{session}} tx new server-dev >/dev/null
	fi
	if ! TMUX_SESSION={{session}} tx list | grep -Eq '^[0-9]+: dashboard-dev( |$)'; then
	TMUX_SESSION={{session}} tx new dashboard-dev >/dev/null
	fi
	TMUX_SESSION={{session}} tx send server-dev "cd {{justfile_directory()}} && pnpm --filter @atlascrew/apparatus dev"
	TMUX_SESSION={{session}} tx send dashboard-dev "cd {{justfile_directory()}} && pnpm --filter @atlascrew/apparatus-dashboard dev --force"
	echo "Live reload started in tmux session '{{session}}': server-dev + dashboard-dev"

# Show tx/tmux status for live-reload windows
aps-dev-status session="aps":
	#!/usr/bin/env bash
	set -euo pipefail
	TMUX_SESSION={{session}} tx list
	echo ""
	echo "[server-dev]"
	if TMUX_SESSION={{session}} tx list | grep -Eq '^[0-9]+: server-dev( |$)'; then
	TMUX_SESSION={{session}} tx read server-dev 20
	else
	echo "(missing)"
	fi
	echo ""
	echo "[dashboard-dev]"
	if TMUX_SESSION={{session}} tx list | grep -Eq '^[0-9]+: dashboard-dev( |$)'; then
	TMUX_SESSION={{session}} tx read dashboard-dev 20
	else
	echo "(missing)"
	fi

# Stop live-reload commands (keeps tmux windows)
aps-dev-stop session="aps":
    @TMUX_SESSION={{session}} tx interrupt server-dev >/dev/null 2>&1 || true
    @TMUX_SESSION={{session}} tx interrupt dashboard-dev >/dev/null 2>&1 || true
    @echo "Live reload stopped in tmux session '{{session}}'"

# Restart live-reload commands in tmux
aps-dev-restart session="aps":
	#!/usr/bin/env bash
	set -euo pipefail
	if ! TMUX_SESSION={{session}} tx list | grep -Eq '^[0-9]+: server-dev( |$)'; then
	TMUX_SESSION={{session}} tx new server-dev >/dev/null
	fi
	if ! TMUX_SESSION={{session}} tx list | grep -Eq '^[0-9]+: dashboard-dev( |$)'; then
	TMUX_SESSION={{session}} tx new dashboard-dev >/dev/null
	fi
	TMUX_SESSION={{session}} tx send server-dev "cd {{justfile_directory()}} && pnpm --filter @atlascrew/apparatus dev"
	TMUX_SESSION={{session}} tx send dashboard-dev "cd {{justfile_directory()}} && pnpm --filter @atlascrew/apparatus-dashboard dev --force"
	echo "Live reload restarted in tmux session '{{session}}'"

# ── Test ─────────────────────────────────────────────────────

# Run all tests
test:
    pnpm nx run-many -t test

# Run server tests
test-server:
    pnpm nx run apparatus:test

# Run client tests
test-client:
    pnpm nx run client:test

# Run a single test file
test-file file:
    cd apps/apparatus && npx vitest run {{file}}

# Run tests in watch mode
test-watch:
    cd apps/apparatus && npx vitest

# ── Quality ──────────────────────────────────────────────────

# Type-check all packages
check:
    pnpm nx run-many -t type-check

# Lint all packages
lint:
    pnpm nx run-many -t lint

# Build + type-check + lint + test
ci: build check lint test

# ── Utilities ────────────────────────────────────────────────

# Install dependencies
install:
    pnpm install

# Clean all build artifacts
clean:
    rm -rf apps/apparatus/dist apps/cli/dist libs/client/dist
    rm -rf .nx

# Reset Nx cache
reset-cache:
    pnpm nx reset

# Generate self-signed TLS certs
gen-certs:
    cd apps/apparatus && pnpm run gen-self-signed

# Symlink apparatus tools into ~/bin (or --target DIR)
link-tools *args:
    bash scripts/link-tools.sh {{args}}

# Remove apparatus tool symlinks
unlink-tools *args:
    bash scripts/link-tools.sh --unlink {{args}}

# Show the Nx dependency graph
graph:
    pnpm nx graph

# ── Release ────────────────────────────────────────────────
#
# Per-package versioning. Each package has its own version and tag.
#   Tag format: <pkg>-v<semver>  (e.g. apparatus-v1.0.0, apparatus-sdk-v0.9.1)
#   Pushing a tag triggers the matching CI publish job.
#
# Package map (short name → package.json path):
_pkg_apparatus         := "apps/apparatus/package.json"
_pkg_apparatus_sdk     := "libs/client/package.json"
_pkg_apparatus_cli     := "apps/cli/package.json"
_pkg_apparatus_dash    := "apps/apparatus/src/dashboard/package.json"

# Show current versions for all packages
versions:
	@echo "apparatus        $(jq -r .version {{_pkg_apparatus}})"
	@echo "apparatus-sdk    $(jq -r .version {{_pkg_apparatus_sdk}})"
	@echo "apparatus-cli    $(jq -r .version {{_pkg_apparatus_cli}})"
	@echo "apparatus-dash   $(jq -r .version {{_pkg_apparatus_dash}})"

# Show version for a specific package
version pkg="apparatus":
	#!/usr/bin/env bash
	set -euo pipefail
	case "{{pkg}}" in
	  apparatus)        jq -r .version {{_pkg_apparatus}} ;;
	  apparatus-sdk|apparatus-client) jq -r .version {{_pkg_apparatus_sdk}} ;;
	  apparatus-cli)    jq -r .version {{_pkg_apparatus_cli}} ;;
	  apparatus-dash)   jq -r .version {{_pkg_apparatus_dash}} ;;
	  *) echo "Unknown package: {{pkg}}. Use: apparatus, apparatus-sdk, apparatus-cli, apparatus-dash"; exit 1 ;;
	esac

# Bump a package version (just bump <pkg> [patch|minor|major])
bump pkg="apparatus" level="patch":
	#!/usr/bin/env bash
	set -euo pipefail
	case "{{pkg}}" in
	  apparatus)        files="{{_pkg_apparatus}}" ;;
	  apparatus-sdk|apparatus-client) files="{{_pkg_apparatus_sdk}}" ;;
	  apparatus-cli)    files="{{_pkg_apparatus_cli}}" ;;
	  apparatus-dash)   files="{{_pkg_apparatus_dash}}" ;;
	  *) echo "Unknown package: {{pkg}}. Use: apparatus, apparatus-sdk, apparatus-cli, apparatus-dash"; exit 1 ;;
	esac
	current=$(jq -r .version $files)
	IFS='.' read -r major minor patch <<< "$current"
	case "{{level}}" in
	  patch) patch=$((patch + 1)) ;;
	  minor) minor=$((minor + 1)); patch=0 ;;
	  major) major=$((major + 1)); minor=0; patch=0 ;;
	  *) echo "Usage: just bump <pkg> [patch|minor|major]"; exit 1 ;;
	esac
	next="${major}.${minor}.${patch}"
	jq --arg v "$next" '.version = $v' "$files" > "$files.tmp" && mv "$files.tmp" "$files"
	echo "{{pkg}}: $current → $next"

# Tag and push to trigger npm publish for a package
release pkg="apparatus":
	#!/usr/bin/env bash
	set -euo pipefail
	case "{{pkg}}" in
	  apparatus)
	    file="{{_pkg_apparatus}}"
	    tag_prefix="apparatus"
	    ;;
	  apparatus-sdk|apparatus-client)
	    file="{{_pkg_apparatus_sdk}}"
	    tag_prefix="apparatus-sdk"
	    ;;
	  apparatus-cli)
	    file="{{_pkg_apparatus_cli}}"
	    tag_prefix="apparatus-cli"
	    ;;
	  *)
	    echo "Unknown publishable package: {{pkg}}. Use: apparatus, apparatus-sdk, apparatus-cli"
	    exit 1
	    ;;
	esac
	version=$(jq -r .version "$file")
	tag="${tag_prefix}-v${version}"
	if git rev-parse "$tag" >/dev/null 2>&1; then
	  echo "Error: tag $tag already exists. Bump first: just bump {{pkg}} [patch|minor|major]"
	  exit 1
	fi
	echo "Tagging $tag..."
	git tag "$tag"
	git push origin "$tag"
	echo "Pushed $tag — npm publish workflow triggered"

# Release all publishable packages at their current versions
release-all:
	just release apparatus
	just release apparatus-sdk
	just release apparatus-cli

# ── Docs ───────────────────────────────────────

# Ruby path (Homebrew); override with RUBY_DIR= if needed
ruby_bin := env("RUBY_DIR", "/opt/homebrew/opt/ruby/bin")

# Serve the documentation site locally (Jekyll, default port 4000)
docs-serve port="4000":
    cd docs && PATH="{{ruby_bin}}:$PATH" bundle install --quiet && PATH="{{ruby_bin}}:$PATH" bundle exec jekyll serve --port {{port}} --livereload --livereload-port 35730

# Build the documentation site without serving
docs-build:
    cd docs && PATH="{{ruby_bin}}:$PATH" bundle install --quiet && PATH="{{ruby_bin}}:$PATH" bundle exec jekyll build
