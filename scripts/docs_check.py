#!/usr/bin/env python3
"""
Mechanical documentation validator for OmniSpatial repository.
Zero external dependencies (uses standard library only).

Enforces:
1. Path Existence: Backticked file/directory paths in docs/ and AGENTS.md exist on disk.
2. Overview Integrity: Every docs/NN-* folder has 00-overview.md linking all sub-files.
3. Backlink Integrity: Every sub-file in docs/NN-* has a top backlink to ./00-overview.md.
4. Link Integrity: Relative markdown links resolve to real files on disk.
5. Reverse Coverage: Primary code entry points are referenced in documentation.
"""

import sys
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DOCS_DIR = REPO_ROOT / "docs"
AGENTS_MD = REPO_ROOT / "AGENTS.md"

PRIMARY_ENTRY_POINTS = [
    "backend/app/main.py",
    "backend/app/services/meta_client.py",
    "backend/app/services/sam_service.py",
    "backend/app/services/reasoning_engine.py",
    "backend/app/services/modal_app.py",
    "frontend/index.html",
    "frontend/app.js",
    "scripts/docs_check.py",
]

IGNORE_PATH_PREFIXES = (
    "http://", "https://", "ws://", "wss://", "/",
    "-", "git ", "python", "pip ", "uvicorn ", "curl ", "modal ", "npm ",
    "data:", "data-", "seg.", "step", "comp_", "U1", "C1", "J1", "T4", "A10G", "L4",
    "meta/", '"', "'", "app."
)

IGNORE_EXACT = {
    "str", "int", "float", "bool", "dict", "list", "dict[str, any]",
    "list[point]", "boundingbox", "point", "taskstep", "verificationresult",
    "pending", "in_progress", "verified", "failed", "mock_key", "0.0.0.0", "8000",
    "true", "false", "none", "optional[str]"
}

def is_candidate_path(token: str) -> bool:
    token = token.strip()
    if not token or len(token) > 150:
        return False
    # Ignore placeholder / wildcard / template patterns
    if any(char in token for char in ["<", ">", "{", "}", "*", "$"]):
        return False
    if "NNN" in token or "..." in token:
        return False
    if token.lower() in IGNORE_EXACT:
        return False
    for pfx in IGNORE_PATH_PREFIXES:
        if token.startswith(pfx):
            return False
    # Check if looks like a path or specific file
    has_slash = "/" in token
    has_ext = any(token.endswith(ext) for ext in [
        ".py", ".js", ".html", ".css", ".md", ".txt", ".json", ".example", ".sh", ".yml", ".yaml"
    ])
    has_dir_suffix = token.endswith("/")
    return (has_slash or has_ext or has_dir_suffix) and " " not in token

def check_overview_and_backlinks(errors):
    """Checks overview integrity and backlink integrity in docs/NN-* folders."""
    if not DOCS_DIR.exists():
        errors.append("docs/ directory does not exist.")
        return

    subject_folders = [
        d for d in DOCS_DIR.iterdir()
        if d.is_dir() and re.match(r"^\d{2}-", d.name)
    ]

    for folder in sorted(subject_folders):
        overview_file = folder / "00-overview.md"
        if not overview_file.exists():
            errors.append(f"Missing 00-overview.md in {folder.relative_to(REPO_ROOT)}")
            continue

        overview_content = overview_file.read_text(encoding="utf-8")
        all_md_files = sorted([
            f for f in folder.glob("*.md")
            if f.name != "00-overview.md"
        ])

        for sub_file in all_md_files:
            rel_name = sub_file.name
            if rel_name not in overview_content:
                errors.append(
                    f"{folder.name}/00-overview.md does not link to sub-file: {rel_name}"
                )

            lines = [l.strip() for l in sub_file.read_text(encoding="utf-8").splitlines() if l.strip()]
            expected_backlink = "**Back:** [00-overview](./00-overview.md)"
            if not lines or lines[0] != expected_backlink:
                errors.append(
                    f"{sub_file.relative_to(REPO_ROOT)} is missing required top backlink: '{expected_backlink}'"
                )

def check_markdown_links(errors):
    """Verifies all relative markdown links [...](...) resolve to real files."""
    md_files = list(DOCS_DIR.rglob("*.md"))
    if AGENTS_MD.exists():
        md_files.append(AGENTS_MD)
    readme = REPO_ROOT / "README.md"
    if readme.exists():
        md_files.append(readme)

    link_pattern = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')

    for md_file in md_files:
        content = md_file.read_text(encoding="utf-8")
        for match in link_pattern.finditer(content):
            target = match.group(2).strip()
            if target.startswith(("http://", "https://", "mailto:", "ws://", "wss://", "#")):
                continue
            file_part = target.split("#")[0]
            if not file_part:
                continue
            resolved = (md_file.parent / file_part).resolve()
            if not resolved.exists():
                errors.append(
                    f"Broken link in {md_file.relative_to(REPO_ROOT)}: '{target}' (resolved to {resolved})"
                )

def check_backticked_paths(errors):
    """Verifies that backticked relative paths inside docs exist on disk."""
    md_files = list(DOCS_DIR.rglob("*.md"))
    if AGENTS_MD.exists():
        md_files.append(AGENTS_MD)

    code_pattern = re.compile(r'`([^`\n]+)`')

    for md_file in md_files:
        content = md_file.read_text(encoding="utf-8")
        for match in code_pattern.finditer(content):
            token = match.group(1).strip()
            if not is_candidate_path(token):
                continue

            clean_token = token.rstrip("/")
            path_repo = REPO_ROOT / clean_token
            path_local = md_file.parent / clean_token

            # Also check if it's a known filename within the repo
            found_anywhere = False
            if path_repo.exists() or path_local.exists():
                found_anywhere = True
            elif "/" not in clean_token:
                # Check if file exists somewhere under REPO_ROOT
                matches = list(REPO_ROOT.glob(f"**/{clean_token}"))
                if matches:
                    found_anywhere = True

            if not found_anywhere:
                errors.append(
                    f"Path does not exist on disk in {md_file.relative_to(REPO_ROOT)}: `{token}`"
                )

def check_reverse_coverage(errors):
    """Verifies every primary code entry point is referenced by path in docs."""
    all_docs_content = ""
    for md_file in DOCS_DIR.rglob("*.md"):
        all_docs_content += md_file.read_text(encoding="utf-8") + "\n"

    for entry in PRIMARY_ENTRY_POINTS:
        if entry not in all_docs_content:
            errors.append(f"Reverse coverage failure: entry point `{entry}` is not referenced in docs/")

def main():
    errors = []
    print("🔍 Running mechanical docs validator (OmniSpatial)...")

    check_overview_and_backlinks(errors)
    check_markdown_links(errors)
    check_backticked_paths(errors)
    check_reverse_coverage(errors)

    if errors:
        print(f"\n❌ FAILED: {len(errors)} documentation error(s) found:\n")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)

    print("\n✅ PASSED: All documentation checks succeeded with zero errors.")
    sys.exit(0)

if __name__ == "__main__":
    main()
