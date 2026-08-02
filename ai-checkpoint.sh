#!/usr/bin/env bash
# =============================================================================
# Universal AI Handoff System (UAHS)
# Version: 1.0.1
# Compatible: Ubuntu, macOS, Linux, WSL
# =============================================================================

set -euo pipefail

# =============================================================================
# COLOR DEFINITIONS
# =============================================================================
if [[ -t 1 ]] && command -v tput &>/dev/null && [[ $(tput colors 2>/dev/null || echo 0) -gt 0 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    MAGENTA='\033[0;35m'
    CYAN='\033[0;36m'
    WHITE='\033[1;37m'
    GRAY='\033[0;90m'
    BOLD='\033[1m'
    DIM='\033[2m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    MAGENTA=''
    CYAN=''
    WHITE=''
    GRAY=''
    BOLD=''
    DIM=''
    NC=''
fi

# =============================================================================
# GLOBAL VARIABLES
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}"
CHECKPOINT_DIR=""
TIMESTAMP=""
LOG_FILE=""
EXCLUDED_DIRS=()
EXCLUDED_FILES=()
DETECTED_STACK=()

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

log_info() {
    echo -e "${BLUE}[*]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_progress() {
    echo -ne "${CYAN}[→]${NC} $1\r"
}

log_complete() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BOLD}${MAGENTA}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${MAGENTA}║${NC}          ${WHITE}Universal AI Handoff System (UAHS)${NC}              ${BOLD}${MAGENTA}║${NC}"
    echo -e "${BOLD}${MAGENTA}║${NC}                    ${GRAY}Version 1.0.1${NC}                            ${BOLD}${MAGENTA}║${NC}"
    echo -e "${BOLD}${MAGENTA}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

safe_mkdir() {
    mkdir -p "$1" 2>/dev/null || true
}

safe_write() {
    local file="$1"
    local content="$2"
    safe_mkdir "$(dirname "$file")"
    echo "$content" > "$file"
}

get_timestamp() {
    date +"%Y-%m-%d_%H-%M-%S"
}

# Helper: does at least one file matching a glob pattern exist in cwd?
# Usage: glob_exists "*.js"
glob_exists() {
    compgen -G "$1" > /dev/null 2>&1
}

# =============================================================================
# DETECTION FUNCTIONS
# =============================================================================

detect_language() {
    local lang=""

    [[ -f "package.json" ]] && lang+="TypeScript "
    [[ -f "tsconfig.json" ]] && lang+="TypeScript "
    { glob_exists "*.js" || [[ -f "index.js" ]] || [[ -f "app.js" ]]; } && lang+="JavaScript "
    [[ -f "requirements.txt" || -f "pyproject.toml" || -f "setup.py" ]] && lang+="Python "
    [[ -f "Cargo.toml" ]] && lang+="Rust "
    [[ -f "go.mod" ]] && lang+="Go "
    [[ -f "pom.xml" || -f "build.gradle" ]] && lang+="Java "
    [[ -f "composer.json" ]] && lang+="PHP "
    glob_exists "*.csproj" && lang+="C# "
    glob_exists "*.sln" && lang+="C# "
    glob_exists "*.rs" && lang+="Rust "
    glob_exists "*.py" && lang+="Python "
    glob_exists "*.go" && lang+="Go "
    glob_exists "*.java" && lang+="Java "
    glob_exists "*.php" && lang+="PHP "

    echo "${lang}" | tr ' ' '\n' | sort -u | tr '\n' ' ' | sed 's/ $//'
}

detect_framework() {
    local fw=""

    # Frontend
    [[ -f "package.json" ]] && grep -q '"react"' package.json 2>/dev/null && fw+="React "
    [[ -f "package.json" ]] && grep -q '"vue"' package.json 2>/dev/null && fw+="Vue "
    [[ -f "package.json" ]] && grep -q '"@angular/core"' package.json 2>/dev/null && fw+="Angular "
    [[ -f "next.config.js" || -f "next.config.mjs" || -f "next.config.ts" ]] && fw+="Next.js "
    [[ -f "nuxt.config.ts" || -f "nuxt.config.js" ]] && fw+="Nuxt "
    [[ -f "svelte.config.js" ]] && fw+="Svelte "
    [[ -f "vite.config.ts" || -f "vite.config.js" ]] && fw+="Vite "
    [[ -f "tailwind.config.js" || -f "tailwind.config.ts" ]] && fw+="TailwindCSS "
    [[ -f "webpack.config.js" || -f "webpack.config.ts" ]] && fw+="Webpack "

    # Backend
    [[ -f "package.json" ]] && grep -q '"express"' package.json 2>/dev/null && fw+="Express "
    [[ -f "package.json" ]] && grep -q '"@nestjs/core"' package.json 2>/dev/null && fw+="NestJS "
    [[ -f "package.json" ]] && grep -q '"fastify"' package.json 2>/dev/null && fw+="Fastify "
    [[ -f "package.json" ]] && grep -q '"koa"' package.json 2>/dev/null && fw+="Koa "
    [[ -f "manage.py" || -f "wsgi.py" ]] && fw+="Django "
    [[ -f "app.py" ]] && grep -q "flask" app.py 2>/dev/null && fw+="Flask "
    [[ -f "main.py" ]] && grep -q "fastapi" main.py 2>/dev/null && fw+="FastAPI "
    [[ -f "application.properties" || -f "application.yml" ]] && fw+="Spring "
    [[ -f "artisan" ]] && fw+="Laravel "

    echo "${fw}" | tr ' ' '\n' | sort -u | tr '\n' ' ' | sed 's/ $//'
}

detect_database() {
    local db=""

    [[ -f "prisma/schema.prisma" ]] && db+="Prisma/PostgreSQL "
    [[ -f "knexfile.js" || -f "knexfile.ts" ]] && db+="Knex "
    [[ -d "migrations" ]] && db+="Migrations "
    glob_exists "*.sql" && db+="SQL "
    [[ -f "drizzle.config.ts" ]] && db+="Drizzle "
    [[ -f "package.json" ]] && grep -q "mongoose" package.json 2>/dev/null && db+="MongoDB/Mongoose "
    [[ -f "package.json" ]] && grep -q "typeorm" package.json 2>/dev/null && db+="TypeORM "
    [[ -f "package.json" ]] && grep -q "pg" package.json 2>/dev/null && db+="PostgreSQL/pg "
    [[ -f "package.json" ]] && grep -q "mysql" package.json 2>/dev/null && db+="MySQL "
    [[ -f "package.json" ]] && grep -q "better-sqlite3" package.json 2>/dev/null && db+="SQLite "
    [[ -f "requirements.txt" ]] && grep -q "psycopg2" requirements.txt 2>/dev/null && db+="PostgreSQL/Python "
    [[ -f "requirements.txt" ]] && grep -q "sqlalchemy" requirements.txt 2>/dev/null && db+="SQLAlchemy "
    [[ -f "requirements.txt" ]] && grep -q "pymongo" requirements.txt 2>/dev/null && db+="MongoDB/PyMongo "
    [[ -f "requirements.txt" ]] && grep -q "redis" requirements.txt 2>/dev/null && db+="Redis "

    echo "${db}" | tr ' ' '\n' | sort -u | tr '\n' ' ' | sed 's/ $//'
}

detect_blockchain() {
    local bc=""

    [[ -f "hardhat.config.js" || -f "hardhat.config.ts" ]] && bc+="Hardhat "
    [[ -f "foundry.toml" ]] && bc+="Foundry "
    [[ -d "contracts" ]] && bc+="Smart Contracts "
    [[ -f "package.json" ]] && grep -q "ethers" package.json 2>/dev/null && bc+="Ethers.js "
    [[ -f "package.json" ]] && grep -q "viem" package.json 2>/dev/null && bc+="Viem "
    [[ -f "package.json" ]] && grep -q "web3" package.json 2>/dev/null && bc+="Web3.js "
    [[ -f "package.json" ]] && grep -q "@openzeppelin" package.json 2>/dev/null && bc+="OpenZeppelin "
    [[ -f "package.json" ]] && grep -q "wagmi" package.json 2>/dev/null && bc+="Wagmi "

    echo "${bc}" | tr ' ' '\n' | sort -u | tr '\n' ' ' | sed 's/ $//'
}

detect_testing() {
    local test=""

    [[ -f "jest.config.js" || -f "jest.config.ts" ]] && test+="Jest "
    [[ -f "vitest.config.ts" || -f "vitest.config.js" ]] && test+="Vitest "
    [[ -f "package.json" ]] && grep -q '"cypress"' package.json 2>/dev/null && test+="Cypress "
    [[ -f "package.json" ]] && grep -q '"@playwright/test"' package.json 2>/dev/null && test+="Playwright "
    [[ -f "pytest.ini" || -f "conftest.py" ]] && test+="Pytest "
    [[ -f "Cargo.toml" ]] && grep -q "dev-dependencies" Cargo.toml 2>/dev/null && test+="Rust Tests "
    [[ -f "go.mod" ]] && test+="Go Tests "

    echo "${test}" | tr ' ' '\n' | sort -u | tr '\n' ' ' | sed 's/ $//'
}

detect_ai() {
    local ai=""

    [[ -f "package.json" ]] && grep -q "openai" package.json 2>/dev/null && ai+="OpenAI "
    [[ -f "package.json" ]] && grep -q "@anthropic-ai" package.json 2>/dev/null && ai+="Anthropic "
    [[ -f "package.json" ]] && grep -q "langchain" package.json 2>/dev/null && ai+="LangChain "
    [[ -f "package.json" ]] && grep -q "llamaindex" package.json 2>/dev/null && ai+="LlamaIndex "
    [[ -f "requirements.txt" ]] && grep -q "openai" requirements.txt 2>/dev/null && ai+="OpenAI "
    [[ -f "requirements.txt" ]] && grep -q "anthropic" requirements.txt 2>/dev/null && ai+="Anthropic "
    [[ -f "requirements.txt" ]] && grep -q "langchain" requirements.txt 2>/dev/null && ai+="LangChain "
    [[ -f "requirements.txt" ]] && grep -q "llamaindex" requirements.txt 2>/dev/null && ai+="LlamaIndex "

    echo "${ai}" | tr ' ' '\n' | sort -u | tr '\n' ' ' | sed 's/ $//'
}

detect_cloud() {
    local cloud=""

    [[ -f "serverless.yml" ]] && cloud+="AWS Lambda "
    { [[ -d "terraform" ]] || glob_exists "*.tf"; } && cloud+="Terraform "
    [[ -f "docker-compose.yml" || -f "Dockerfile" ]] && cloud+="Docker "
    [[ -f "vercel.json" ]] && cloud+="Vercel "
    [[ -f "netlify.toml" ]] && cloud+="Netlify "
    [[ -f "firebase.json" ]] && cloud+="Firebase "
    [[ -e "supabase" ]] && cloud+="Supabase "
    [[ -f "railway.json" ]] && cloud+="Railway "
    [[ -f "fly.toml" ]] && cloud+="Fly.io "

    echo "${cloud}" | tr ' ' '\n' | sort -u | tr '\n' ' ' | sed 's/ $//'
}

get_project_name() {
    local name=""

    [[ -f "package.json" ]] && name=$(grep -o '"name": *"[^"]*"' package.json 2>/dev/null | head -1 | cut -d'"' -f4)
    [[ -z "$name" && -f "Cargo.toml" ]] && name=$(grep -o '^name = *"[^"]*"' Cargo.toml 2>/dev/null | head -1 | cut -d'"' -f2)
    [[ -z "$name" && -f "go.mod" ]] && name=$(head -1 go.mod 2>/dev/null | awk '{print $2}')
    [[ -z "$name" && -f "pyproject.toml" ]] && name=$(grep -o '^name = *"[^"]*"' pyproject.toml 2>/dev/null | head -1 | cut -d'"' -f2)
    [[ -z "$name" && -f "composer.json" ]] && name=$(grep -o '"name": *"[^"]*"' composer.json 2>/dev/null | head -1 | cut -d'"' -f4)
    [[ -z "$name" && -f "pom.xml" ]] && name=$(grep -o '<artifactId>[^<]*</artifactId>' pom.xml 2>/dev/null | head -1 | sed 's/<[^>]*>//g')

    [[ -z "$name" ]] && name="$(basename "$PROJECT_DIR")"

    echo "$name"
}

get_project_purpose() {
    if [[ -f "README.md" ]]; then
        head -30 README.md 2>/dev/null | grep -v '^#' | grep -v '^\[' | grep -v '^!' | grep -v '^$' | head -5 | tr '\n' ' ' || true
    elif [[ -f "README.rst" ]]; then
        head -30 README.rst 2>/dev/null | grep -v '^=' | grep -v '^\.\.' | grep -v '^$' | head -5 | tr '\n' ' ' || true
    else
        echo "No README found"
    fi
}

# =============================================================================
# FILE COLLECTION
# =============================================================================

should_exclude_dir() {
    local dir="$1"
    local basename="$(basename "$dir")"

    case "$basename" in
        node_modules|.git|dist|build|coverage|.cache|.next|.nuxt|.output|\
        target|vendor|.venv|__pycache__|.mypy_cache|.pytest_cache|.tox|\
        .eggs|*.egg-info|.hg|.svn|.turbo|.parcel-cache|\
        .dart_tool|.gradle|.idea|.vscode|*.xcodeproj|*.xcworkspace|\
        Pods|.pub-cache|.terraform|.tfstate)
            return 0
            ;;
    esac
    return 1
}

should_exclude_file() {
    local file="$1"
    local basename="$(basename "$file")"
    local ext="${file##*.}"

    # Binary files
    case "$ext" in
        png|jpg|jpeg|gif|bmp|ico|svg|webp|mp4|mp3|wav|avi|mov|\
        zip|tar|gz|bz2|rar|7z|exe|dll|so|dylib|bin|obj|\
        o|a|lib|wasm|lock|log)
            return 0
            ;;
    esac

    # Large generated files
    case "$basename" in
        *.min.js|*.min.css|*.map|*.bundle|*.chunk|package-lock.json|\
        yarn.lock|pnpm-lock.yaml|composer.lock|Gemfile.lock|Cargo.lock|\
        go.sum|poetry.lock|Pipfile.lock|.DS_Store|Thumbs.db)
            return 0
            ;;
    esac

    return 1
}

collect_source_files() {
    local output_file="$1"
    > "$output_file"

    log_info "Collecting source files..."

    find "$PROJECT_DIR" -type f \
        ! -path "*/node_modules/*" \
        ! -path "*/.git/*" \
        ! -path "*/dist/*" \
        ! -path "*/build/*" \
        ! -path "*/coverage/*" \
        ! -path "*/.cache/*" \
        ! -path "*/.next/*" \
        ! -path "*/target/*" \
        ! -path "*/vendor/*" \
        ! -path "*/__pycache__/*" \
        ! -path "*/.venv/*" \
        ! -path "*/node_modules/.cache/*" \
        ! -path "*/AI_CHECKPOINT/*" \
        ! -name ".env" \
        ! -name ".env.local" \
        ! -name ".env.*.local" \
        ! -name ".env.development" \
        ! -name ".env.production" \
        ! -name ".env.staging" \
        ! -name ".env.test" \
        ! -name "*.pem" \
        ! -name "*.key" \
        ! -name "id_rsa" \
        ! -name "id_ed25519" \
        ! -name "*.p12" \
        ! -name "*.pfx" \
        ! -name "*.lock" \
        ! -name "*.map" \
        ! -name "*.min.js" \
        ! -name "*.min.css" \
        ! -name "*.bundle.*" \
        ! -name "*.chunk.*" \
        ! -name "*.wasm" \
        ! -name "*.exe" \
        ! -name "*.dll" \
        ! -name "*.so" \
        ! -name "*.dylib" \
        ! -name "*.pyc" \
        ! -name "*.pyo" \
        ! -name ".DS_Store" \
        ! -name "Thumbs.db" \
        2>/dev/null | while read -r file; do

        if file "$file" 2>/dev/null | grep -q text; then
            local rel_path="${file#$PROJECT_DIR/}"

            echo "==================================================" >> "$output_file"
            echo "FILE: $rel_path" >> "$output_file"
            echo "==================================================" >> "$output_file"
            echo "" >> "$output_file"
            cat "$file" >> "$output_file" 2>/dev/null || echo "[Binary or unreadable]" >> "$output_file"
            echo "" >> "$output_file"
            echo "" >> "$output_file"
        fi
    done

    log_complete "Source files collected"
}

generate_file_tree() {
    local output_file="$1"

    log_info "Generating file tree..."

    {
        echo "Project: $(get_project_name)"
        echo "Generated: $(date)"
        echo ""
        tree -a -I 'node_modules|.git|dist|build|coverage|.cache|.next|.nuxt|.output|target|vendor|.venv|__pycache__|.mypy_cache|.pytest_cache|.tox|.eggs|*.egg-info|.hg|.svn|.turbo|.parcel-cache|.dart_tool|.gradle|.idea|.vscode|*.xcodeproj|*.xcworkspace|Pods|.pub-cache|.terraform|.tfstate|*.lock|*.map|*.min.js|*.min.css|*.bundle.*|*.chunk.*|*.wasm' --dirsfirst "$PROJECT_DIR" 2>/dev/null || find "$PROJECT_DIR" -type f -o -type d | grep -v -E '(node_modules|\.git|dist|build|coverage|\.cache|\.next|target|vendor|__pycache__|\.venv)' | head -500
    } > "$output_file"

    log_complete "File tree generated"
}

get_system_info() {
    local output_file="$1"

    log_info "Collecting system information..."

    {
        echo "OS: $(uname -s 2>/dev/null || echo 'Unknown')"
        echo "Kernel: $(uname -r 2>/dev/null || echo 'Unknown')"
        echo "Architecture: $(uname -m 2>/dev/null || echo 'Unknown')"
        echo "Hostname: $(hostname 2>/dev/null || echo 'Unknown')"
        echo "Shell: ${SHELL:-Unknown}"
        echo "User: ${USER:-$(whoami 2>/dev/null || echo Unknown)}"
        echo "Home: ${HOME:-Unknown}"
        echo "PWD: ${PWD:-Unknown}"
        echo ""

        if [[ -f /proc/version ]] && grep -qi microsoft /proc/version 2>/dev/null; then
            echo "WSL: Yes (Windows Subsystem for Linux)"
            echo "WSL Version: $(grep -o 'Microsoft [^)]*' /proc/version 2>/dev/null | head -1)"
        else
            echo "WSL: No"
        fi
        echo ""

        echo "=== Runtime Versions ==="
        echo "Node: $(node --version 2>/dev/null || echo 'Not installed')"
        echo "npm: $(npm --version 2>/dev/null || echo 'Not installed')"
        echo "pnpm: $(pnpm --version 2>/dev/null || echo 'Not installed')"
        echo "yarn: $(yarn --version 2>/dev/null || echo 'Not installed')"
        echo "Bun: $(bun --version 2>/dev/null || echo 'Not installed')"
        echo "Deno: $(deno --version 2>/dev/null | head -1 || echo 'Not installed')"
        echo "Python: $(python3 --version 2>/dev/null || python --version 2>/dev/null || echo 'Not installed')"
        echo "pip: $(pip3 --version 2>/dev/null || pip --version 2>/dev/null || echo 'Not installed')"
        echo "Rust: $(rustc --version 2>/dev/null | head -1 || echo 'Not installed')"
        echo "Cargo: $(cargo --version 2>/dev/null || echo 'Not installed')"
        echo "Go: $(go version 2>/dev/null || echo 'Not installed')"
        echo "Java: $(java -version 2>&1 | head -1 || echo 'Not installed')"
        echo "PHP: $(php --version 2>/dev/null | head -1 || echo 'Not installed')"
        echo "Ruby: $(ruby --version 2>/dev/null || echo 'Not installed')"
        echo ".NET: $(dotnet --version 2>/dev/null || echo 'Not installed')"
        echo ""

        echo "=== Tool Versions ==="
        echo "Git: $(git --version 2>/dev/null || echo 'Not installed')"
        echo "Docker: $(docker --version 2>/dev/null | head -1 || echo 'Not installed')"
        echo "Docker Compose: $(docker-compose --version 2>/dev/null || echo 'Not installed')"
        echo "Terraform: $(terraform --version 2>/dev/null | head -1 || echo 'Not installed')"
        echo "Make: $(make --version 2>/dev/null | head -1 || echo 'Not installed')"
        echo "GCC: $(gcc --version 2>/dev/null | head -1 || echo 'Not installed')"
        echo "Clang: $(clang --version 2>/dev/null | head -1 || echo 'Not installed')"
    } > "$output_file"

    log_complete "System info collected"
}

get_git_info() {
    local output_file="$1"

    log_info "Collecting git information..."

    if ! command -v git &>/dev/null || [[ ! -d "$PROJECT_DIR/.git" ]]; then
        echo "Not a git repository" > "$output_file"
        log_warn "Not a git repository"
        return
    fi

    {
        echo "=== Git Status ==="
        git -C "$PROJECT_DIR" status --short 2>/dev/null || echo "Unable to get status"
        echo ""

        echo "=== Current Branch ==="
        git -C "$PROJECT_DIR" branch --show-current 2>/dev/null || echo "Unable to get branch"
        echo ""

        echo "=== Remote URLs ==="
        git -C "$PROJECT_DIR" remote -v 2>/dev/null || echo "No remotes"
        echo ""

        echo "=== Last 20 Commits ==="
        git -C "$PROJECT_DIR" log --oneline -20 2>/dev/null || echo "No commits"
        echo ""

        echo "=== Changed Files (Staged + Unstaged) ==="
        git -C "$PROJECT_DIR" diff --name-only HEAD 2>/dev/null || echo "None"
        echo ""

        echo "=== Untracked Files ==="
        git -C "$PROJECT_DIR" ls-files --others --exclude-standard 2>/dev/null || echo "None"
        echo ""

        echo "=== Stash List ==="
        git -C "$PROJECT_DIR" stash list 2>/dev/null || echo "No stashes"
    } > "$output_file"

    log_complete "Git info collected"
}

# =============================================================================
# DOCUMENT GENERATORS
# =============================================================================

generate_ai_context() {
    local output_file="$1"

    log_info "Generating AI_CONTEXT.md..."

    local project_name=$(get_project_name)
    local languages=$(detect_language)
    local frameworks=$(detect_framework)
    local databases=$(detect_database)
    local blockchain=$(detect_blockchain)
    local testing=$(detect_testing)
    local ai=$(detect_ai)
    local cloud=$(detect_cloud)
    local git_branch=$(git -C "$PROJECT_DIR" branch --show-current 2>/dev/null || echo "N/A")
    local purpose=$(get_project_purpose)

    local main_folders=$(find "$PROJECT_DIR" -maxdepth 1 -type d ! -name ".*" ! -name "node_modules" ! -name "dist" ! -name "build" ! -name "target" ! -name "vendor" 2>/dev/null | xargs -I {} basename {} | tr '\n' ',' | sed 's/,$//')

    local entry_points=""
    [[ -f "index.js" ]] && entry_points+="index.js "
    [[ -f "index.ts" ]] && entry_points+="index.ts "
    [[ -f "main.ts" ]] && entry_points+="main.ts "
    [[ -f "main.py" ]] && entry_points+="main.py "
    [[ -f "app.py" ]] && entry_points+="app.py "
    [[ -f "main.go" ]] && entry_points+="main.go "
    [[ -f "main.rs" ]] && entry_points+="main.rs "
    [[ -f "src/main.ts" ]] && entry_points+="src/main.ts "
    [[ -f "src/server.ts" ]] && entry_points+="src/server.ts "
    [[ -f "src/index.ts" ]] && entry_points+="src/index.ts "

    local configs=""
    [[ -f ".env.example" ]] && configs+=".env.example "
    [[ -f ".env.local" ]] && configs+=".env.local "
    [[ -f "tsconfig.json" ]] && configs+="tsconfig.json "
    [[ -f "vite.config.ts" ]] && configs+="vite.config.ts "
    [[ -f "next.config.js" ]] && configs+="next.config.js "
    [[ -f "tailwind.config.js" ]] && configs+="tailwind.config.js "
    [[ -f "eslint.config.js" ]] && configs+="eslint.config.js "
    [[ -f "prettier.config.js" ]] && configs+="prettier.config.js "
    [[ -f "docker-compose.yml" ]] && configs+="docker-compose.yml "
    [[ -f "Dockerfile" ]] && configs+="Dockerfile "
    [[ -f "hardhat.config.ts" ]] && configs+="hardhat.config.ts "
    [[ -f "foundry.toml" ]] && configs+="foundry.toml "

    local apis=""
    [[ -d "src/routes" ]] && apis+="/api/* routes "
    [[ -d "src/api" ]] && apis+="/api/* endpoints "
    [[ -f "src/api.ts" ]] && apis+="API handlers "
    [[ -d "pages/api" ]] && apis+="Next.js API routes "

    local contracts=""
    [[ -d "contracts" ]] && contracts+="contracts/ directory "
    [[ -d "src/contracts" ]] && contracts+="src/contracts/ directory "
    local sol_files
    sol_files=$(find "$PROJECT_DIR" -name "*.sol" ! -path "*/node_modules/*" 2>/dev/null | head -5)
    if [[ -n "$sol_files" ]]; then
        contracts+="$(echo "$sol_files" | tr '\n' ' ')"
    fi

    {
        echo "# AI Context: $project_name"
        echo ""
        echo "## Executive Summary"
        echo ""
        echo "**Project Name:** $project_name"
        echo "**Detected Languages:** ${languages:-None detected}"
        echo "**Frameworks:** ${frameworks:-None detected}"
        echo "**Databases:** ${databases:-None detected}"
        echo "**Blockchain Stack:** ${blockchain:-None detected}"
        echo "**Testing:** ${testing:-None detected}"
        echo "**AI/ML:** ${ai:-None detected}"
        echo "**Cloud/Platform:** ${cloud:-None detected}"
        echo ""
        echo "---"
        echo ""
        echo "## Git Information"
        echo ""
        echo "- **Current Branch:** $git_branch"
        echo "- **Checkpoint Timestamp:** $(date -Iseconds)"
        echo ""
        echo "---"
        echo ""
        echo "## Project Structure"
        echo ""
        echo "**Main Folders:** $main_folders"
        echo ""
        echo "---"
        echo ""
        echo "## Project Purpose"
        echo ""
        echo "$purpose"
        echo ""
        echo "---"
        echo ""
        echo "## Entry Points"
        echo ""
        echo "${entry_points:-None detected}"
        echo ""
        echo "---"
        echo ""
        echo "## Configuration Files"
        echo ""
        echo "${configs:-None detected}"
        echo ""
        echo "---"
        echo ""
        echo "## Detected APIs"
        echo ""
        echo "${apis:-None detected}"
        echo ""
        echo "---"
        echo ""
        echo "## Smart Contracts"
        echo ""
        echo "${contracts:-None detected}"
        echo ""
        echo "---"
        echo ""
        echo "## Package Managers"
        echo ""
        local pkg_managers=""
        [[ -f "package.json" ]] && pkg_managers+="npm/yarn/pnpm "
        [[ -f "Cargo.toml" ]] && pkg_managers+="Cargo "
        [[ -f "go.mod" ]] && pkg_managers+="Go modules "
        [[ -f "requirements.txt" ]] && pkg_managers+="pip "
        [[ -f "pyproject.toml" ]] && pkg_managers+="poetry/pip "
        [[ -f "composer.json" ]] && pkg_managers+="Composer "
        [[ -f "pom.xml" ]] && pkg_managers+="Maven "
        echo "${pkg_managers:-None detected}"
        echo ""
    } > "$output_file"

    log_complete "AI_CONTEXT.md generated"
}

generate_project_status() {
    local output_file="$1"

    log_info "Generating PROJECT_STATUS.md..."

    local total_files=$(find "$PROJECT_DIR" -type f ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" ! -path "*/build/*" 2>/dev/null | wc -l)
    local total_dirs=$(find "$PROJECT_DIR" -type d ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" ! -path "*/build/*" 2>/dev/null | wc -l)

    local ts_files=$(find "$PROJECT_DIR" \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" ! -path "*/dist/*" 2>/dev/null | wc -l)
    local js_files=$(find "$PROJECT_DIR" \( -name "*.js" -o -name "*.jsx" \) ! -path "*/node_modules/*" ! -path "*/dist/*" 2>/dev/null | wc -l)
    local py_files=$(find "$PROJECT_DIR" -name "*.py" ! -path "*/__pycache__/*" ! -path "*/.venv/*" 2>/dev/null | wc -l)
    local rs_files=$(find "$PROJECT_DIR" -name "*.rs" ! -path "*/target/*" 2>/dev/null | wc -l)
    local go_files=$(find "$PROJECT_DIR" -name "*.go" ! -path "*/vendor/*" 2>/dev/null | wc -l)

    {
        echo "# Project Status Report"
        echo ""
        echo "**Generated:** $(date)"
        echo ""
        echo "---"
        echo ""
        echo "## File Statistics"
        echo ""
        echo "- **Total Files:** $total_files"
        echo "- **Total Directories:** $total_dirs"
        echo "- **TypeScript Files:** $ts_files"
        echo "- **JavaScript Files:** $js_files"
        echo "- **Python Files:** $py_files"
        echo "- **Rust Files:** $rs_files"
        echo "- **Go Files:** $go_files"
        echo ""
        echo "---"
        echo ""
        echo "## Completed Modules"
        echo ""
        echo "Detected from project structure:"
        echo ""
        find "$PROJECT_DIR" -maxdepth 3 -type d \( -name "src" -o -name "lib" -o -name "components" -o -name "pages" -o -name "routes" -o -name "services" -o -name "models" -o -name "controllers" -o -name "hooks" -o -name "utils" -o -name "helpers" -o -name "middleware" -o -name "api" -o -name "contracts" -o -name "tests" -o -name "__tests__" \) ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" 2>/dev/null | while read -r dir; do
            local rel="${dir#$PROJECT_DIR/}"
            local file_count=$(find "$dir" -type f 2>/dev/null | wc -l)
            echo "- **$rel** ($file_count files)"
        done
        echo ""
        echo "---"
        echo ""
        echo "## Existing APIs"
        echo ""
        echo "Detected from route/handler files:"
        echo ""
        find "$PROJECT_DIR" \( -name "*route*" -o -name "*handler*" -o -name "*controller*" -o -name "*api*" \) -type f ! -path "*/node_modules/*" ! -path "*/dist/*" 2>/dev/null | head -20 | while read -r f; do
            local rel="${f#$PROJECT_DIR/}"
            echo "- $rel"
        done
        echo ""
        echo "---"
        echo ""
        echo "## Database Status"
        echo ""
        local db=$(detect_database)
        if [[ -n "$db" ]]; then
            echo "**Detected:** $db"
            echo ""
            if [[ -d "migrations" ]]; then
                echo "**Migrations:** $(ls -1 migrations 2>/dev/null | wc -l) files"
            fi
            if [[ -f "prisma/schema.prisma" ]]; then
                echo "**Prisma Models:** $(grep -c 'model ' prisma/schema.prisma 2>/dev/null || echo 0)"
            fi
        else
            echo "No database detected"
        fi
        echo ""
        echo "---"
        echo ""
        echo "## Build Status"
        echo ""
        if [[ -f "package.json" ]]; then
            echo "**Node.js project detected**"
            echo "- Run: \`npm run build\` to verify"
        fi
        if [[ -f "Cargo.toml" ]]; then
            echo "**Rust project detected**"
            echo "- Run: \`cargo build\` to verify"
        fi
        if [[ -f "go.mod" ]]; then
            echo "**Go project detected**"
            echo "- Run: \`go build\` to verify"
        fi
        if [[ -f "pyproject.toml" ]] || [[ -f "setup.py" ]]; then
            echo "**Python project detected**"
            echo "- Run: \`python setup.py build\` or \`pip install -e .\` to verify"
        fi
        echo ""
        echo "---"
        echo ""
        echo "## Git Status"
        echo ""
        if [[ -d ".git" ]]; then
            echo "- **Branch:** $(git branch --show-current 2>/dev/null || echo N/A)"
            echo "- **Modified Files:** $(git status --porcelain 2>/dev/null | grep -c '^[MA]' || echo 0)"
            echo "- **Untracked Files:** $(git status --porcelain 2>/dev/null | grep -c '^??' || echo 0)"
            echo "- **Last Commit:** $(git log -1 --oneline 2>/dev/null || echo N/A)"
        else
            echo "Not a git repository"
        fi
        echo ""
        echo "---"
        echo ""
        echo "## Recent Commits"
        echo ""
        git log --oneline -10 2>/dev/null || echo "No commits"
        echo ""
        echo "---"
        echo ""
        echo "## Potential TODOs"
        echo ""
        echo "Detected from source comments:"
        echo ""
        grep -r "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" --include="*.rs" --include="*.go" "$PROJECT_DIR" 2>/dev/null | head -20 | while read -r line; do
            local file=$(echo "$line" | cut -d: -f1)
            local rel="${file#$PROJECT_DIR/}"
            local todo=$(echo "$line" | grep -o 'TODO\|FIXME\|HACK\|XXX[^"]*' | head -1)
            echo "- $rel: $todo"
        done || true
        echo ""
        echo "---"
        echo ""
        echo "## Known Warnings"
        echo ""
        echo "Check for:"
        echo "- TypeScript strict mode issues: \`npx tsc --noEmit\`"
        echo "- ESLint warnings: \`npm run lint\`"
        echo "- Python type issues: \`mypy .\`"
        echo "- Rust clippy warnings: \`cargo clippy\`"
        echo ""
        echo "---"
        echo ""
        echo "## Detected Environment Variables"
        echo ""
        if [[ -f ".env.example" ]]; then
            grep -v '^#' .env.example 2>/dev/null | grep '=' | while read -r line; do
                local var=$(echo "$line" | cut -d= -f1)
                echo "- $var"
            done || true
        else
            echo "No .env.example found"
        fi
        echo ""
        echo "---"
        echo ""
        echo "## Pending Implementations"
        echo ""
        echo "Inferred from empty/stub files and TODOs:"
        echo ""
        find "$PROJECT_DIR" -type f \( -name "*.ts" -o -name "*.js" -o -name "*.py" \) ! -path "*/node_modules/*" ! -path "*/dist/*" 2>/dev/null | while read -r f; do
            if grep -q "TODO\|FIXME\|not implemented\|throw new Error" "$f" 2>/dev/null; then
                local rel="${f#$PROJECT_DIR/}"
                echo "- $rel"
            fi
        done
        echo ""
    } > "$output_file"

    log_complete "PROJECT_STATUS.md generated"
}

generate_handoff_prompt() {
    local output_file="$1"

    log_info "Generating HANDOFF_PROMPT.md..."

    local project_name=$(get_project_name)

    {
        echo "# AI Handoff Prompt"
        echo ""
        echo "You are continuing an existing software project: **$project_name**"
        echo ""
        echo "## Critical Instructions"
        echo ""
        echo "1. **Read everything** inside the AI_CHECKPOINT directory before writing any code."
        echo "2. **Treat the current implementation as the source of truth.**"
        echo "3. **Do NOT redesign the architecture.**"
        echo "4. **Do NOT rename files or reorganize the project structure.**"
        echo "5. **Do NOT rewrite working code.**"
        echo "6. **Preserve all business logic, APIs, IDs, database formats, and event systems.**"
        echo "7. **Only implement the specific features requested.**"
        echo "8. **Maintain backward compatibility with existing data and APIs.**"
        echo "9. **Follow the existing coding patterns and style.**"
        echo "10. **Test your changes don't break existing functionality.**"
        echo ""
        echo "## Before Coding"
        echo ""
        echo "1. Read \`AI_CONTEXT.md\` to understand the project overview."
        echo "2. Read \`PROJECT_STATUS.md\` to understand current state."
        echo "3. Read \`FILE_TREE.txt\` to understand the structure."
        echo "4. Read relevant source files in \`PROJECT_DUMP.txt\`."
        echo "5. Summarize your understanding of the relevant modules."
        echo "6. Identify potential risks or breaking changes."
        echo "7. Ask only if critical information is missing for the task."
        echo ""
        echo "## Architecture Constraints"
        echo ""
        echo "- **Database:** Do not introduce new ORMs or migration frameworks unless explicitly requested."
        echo "- **State Management:** Preserve existing state patterns (Redux, Zustand, Context, etc.)."
        echo "- **API Contracts:** Do not change request/response formats."
        echo "- **IDs:** Do not change ID formats or generation methods."
        echo "- **Event Systems:** Preserve event types and payloads."
        echo "- **Error Handling:** Follow existing error handling patterns."
        echo ""
        echo "## Code Quality Requirements"
        echo ""
        echo "- Match existing code style (indentation, naming, etc.)."
        echo "- Add appropriate TypeScript types (if applicable)."
        echo "- Include necessary error handling."
        echo "- Add comments for complex logic."
        echo "- Do not add unnecessary dependencies."
        echo ""
        echo "## Testing"
        echo ""
        echo "- If tests exist, ensure new code passes existing tests."
        echo "- Add tests for new functionality if testing framework is detected."
        echo "- Do not remove or skip existing tests."
        echo ""
        echo "## What NOT to Do"
        echo ""
        echo "- ❌ Do not convert between frameworks (e.g., JavaScript to TypeScript, Express to NestJS)"
        echo "- ❌ Do not add new state management libraries"
        echo "- ❌ Do not change the database schema without explicit request"
        echo "- ❌ Do not refactor \"for better practices\" unless asked"
        echo "- ❌ Do not add new API endpoints unless asked"
        echo "- ❌ Do not change existing API response formats"
        echo "- ❌ Do not remove existing features or configurations"
        echo ""
        echo "## What TO Do"
        echo ""
        echo "- ✅ Make minimal, surgical changes"
        echo "- ✅ Follow existing patterns exactly"
        echo "- ✅ Preserve all existing functionality"
        echo "- ✅ Test your changes thoroughly"
        echo "- ✅ Explain your reasoning before significant changes"
        echo "- ✅ Ask if unclear about requirements"
        echo ""
    } > "$output_file"

    log_complete "HANDOFF_PROMPT.md generated"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    print_header

    TIMESTAMP=$(get_timestamp)
    CHECKPOINT_DIR="$PROJECT_DIR/AI_CHECKPOINT/$TIMESTAMP"

    log_info "Project directory: $PROJECT_DIR"
    log_info "Checkpoint directory: $CHECKPOINT_DIR"
    echo ""

    safe_mkdir "$CHECKPOINT_DIR"

    generate_ai_context "$CHECKPOINT_DIR/AI_CONTEXT.md"
    generate_project_status "$CHECKPOINT_DIR/PROJECT_STATUS.md"
    collect_source_files "$CHECKPOINT_DIR/PROJECT_DUMP.txt"
    get_system_info "$CHECKPOINT_DIR/SYSTEM_INFO.txt"
    get_git_info "$CHECKPOINT_DIR/GIT_INFO.txt"
    generate_file_tree "$CHECKPOINT_DIR/FILE_TREE.txt"
    generate_handoff_prompt "$CHECKPOINT_DIR/HANDOFF_PROMPT.md"

    echo ""
    echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${GREEN}║${NC}                ${WHITE}AI Checkpoint Complete${NC}                     ${BOLD}${GREEN}║${NC}"
    echo -e "${BOLD}${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${BOLD}${GREEN}║${NC}                                                              ${BOLD}${GREEN}║${NC}"
    echo -e "${BOLD}${GREEN}║${NC}  ${CYAN}Location:${NC}    AI_CHECKPOINT/$TIMESTAMP/                        ${BOLD}${GREEN}║${NC}"
    echo -e "${BOLD}${GREEN}║${NC}                                                              ${BOLD}${GREEN}║${NC}"
    echo -e "${BOLD}${GREEN}║${NC}  ${CYAN}Files:${NC}                                                            ${BOLD}${GREEN}║${NC}"
    echo -e "${BOLD}${GREEN}║${NC}    ${GRAY}✓ AI_CONTEXT.md${NC}         - Project overview              ${BOLD}${GREEN}║${NC}"
    echo -e "${BOLD}${GREEN}║${NC}    ${GRAY}✓ PROJECT_STATUS.md${NC}     - Current status               ${BOLD}${GREEN}║${NC}"
    echo -e "${BOLD}${GREEN}║${NC}    ${GRAY}✓ PROJECT_DUMP.txt${NC}      - Complete source dump         ${BOLD}${GREEN}║${NC}"
    echo -e "${BOLD}${GREEN}║${NC}    ${GRAY}✓ SYSTEM_INFO.txt${NC}       - System information           ${BOLD}${GREEN}║${NC}"
    echo -e "${BOLD}${GREEN}║${NC}    ${GRAY}✓ GIT_INFO.txt${NC}          - Git status                  ${BOLD}${GREEN}║${NC}"
    echo -e "${BOLD}${GREEN}║${NC}    ${GRAY}✓ FILE_TREE.txt${NC}         - Directory structure          ${BOLD}${GREEN}║${NC}"
    echo -e "${BOLD}${GREEN}║${NC}    ${GRAY}✓ HANDOFF_PROMPT.md${NC}     - Reusable AI prompt           ${BOLD}${GREEN}║${NC}"
    echo -e "${BOLD}${GREEN}║${NC}                                                              ${BOLD}${GREEN}║${NC}"
    echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

main "$@"
