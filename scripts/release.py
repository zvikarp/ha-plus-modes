"""Plant Care-compatible version preparation and clean HACS packaging."""

import argparse
import json
import os
import re
import subprocess
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


def version_tuple(value):
    match = re.fullmatch(r"v?(\d+)\.(\d+)\.(\d+)", value)
    if match is None:
        raise ValueError(f"Expected a stable semantic version, got {value!r}")
    return tuple(map(int, match.groups()))


def read_versions(root):
    manifest_path = root / "custom_components/modes_plus/manifest.json"
    manifest = json.loads(manifest_path.read_text())
    project_path = root / "pyproject.toml"
    project = project_path.read_text()
    match = re.search(r'^version = "(\d+\.\d+\.\d+)"$', project, re.MULTILINE)
    if match is None or match.group(1) != manifest["version"]:
        raise ValueError("Manifest and project versions must match before release")
    version_tuple(manifest["version"])
    return manifest_path, manifest, project_path, project, match


def prepare(root, bump, releases):
    if bump not in ("patch", "minor", "major"):
        raise ValueError("Unsupported version bump")
    manifest_path, manifest, project_path, project, match = read_versions(root)
    released = []
    for release in releases:
        if release.get("isDraft") or release.get("isPrerelease"):
            continue
        try:
            released.append(version_tuple(release["tagName"]))
        except ValueError:
            continue
    latest = max(released, default=(0, 0, 0))
    current = version_tuple(manifest["version"])
    if current > latest:
        next_version = current
    else:
        major, minor, patch = latest
        next_version = {
            "patch": (major, minor, patch + 1),
            "minor": (major, minor + 1, 0),
            "major": (major + 1, 0, 0),
        }[bump]
    version = ".".join(map(str, next_version))
    manifest["version"] = version
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    project_path.write_text(
        project[: match.start(1)] + version + project[match.end(1) :]
    )
    return version


def package(root, output, tag=None):
    _, manifest, _, _, _ = read_versions(root)
    if tag is not None and version_tuple(tag) != version_tuple(manifest["version"]):
        raise ValueError("Release tag must match the integration version")
    source = root / "custom_components/modes_plus"
    with ZipFile(output, "w", ZIP_DEFLATED) as archive:
        for path in sorted(source.rglob("*")):
            if (
                path.is_file()
                and "__pycache__" not in path.parts
                and path.suffix != ".pyc"
            ):
                archive.write(path, path.relative_to(source))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    prepare_parser = commands.add_parser("prepare")
    prepare_parser.add_argument("bump", choices=["patch", "minor", "major"])
    package_parser = commands.add_parser("package")
    package_parser.add_argument("--tag")
    args = parser.parse_args()
    root = Path.cwd()
    if args.command == "prepare":
        releases = json.loads(
            subprocess.check_output(
                [
                    "gh",
                    "release",
                    "list",
                    "--limit",
                    "100",
                    "--json",
                    "tagName,isDraft,isPrerelease",
                ],
                text=True,
            )
        )
        version = prepare(root, args.bump, releases)
        with Path(os.environ["GITHUB_OUTPUT"]).open("a") as output:
            output.write(f"version={version}\ntag=v{version}\n")
    else:
        package(root, root / "modes_plus.zip", args.tag)


if __name__ == "__main__":
    main()
