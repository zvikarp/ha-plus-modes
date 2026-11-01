"""Exercise release version decisions and the actual HACS archive layout."""

import json
from zipfile import ZipFile

import pytest

from scripts.release import package, prepare


@pytest.fixture
def project(tmp_path):
    source = tmp_path / "custom_components/modes_plus"
    source.mkdir(parents=True)
    (source / "manifest.json").write_text(json.dumps({"version": "0.2.0"}))
    (tmp_path / "pyproject.toml").write_text('[project]\nversion = "0.2.0"\n')
    (source / "__init__.py").write_text('"""Integration."""\n')
    return tmp_path


@pytest.mark.parametrize(
    ("bump", "expected"), [("patch", "0.2.1"), ("minor", "0.3.0"), ("major", "1.0.0")]
)
def test_bump_after_latest_stable_release(project, bump, expected):
    assert prepare(project, bump, [{"tagName": "v0.2.0"}]) == expected
    assert (
        json.loads(
            (project / "custom_components/modes_plus/manifest.json").read_text()
        )["version"]
        == expected
    )
    assert f'version = "{expected}"' in (project / "pyproject.toml").read_text()


def test_first_or_already_prepared_version_is_reused(project):
    assert prepare(project, "patch", []) == "0.2.0"
    assert (
        prepare(
            project,
            "patch",
            [
                {"tagName": "v0.1.0"},
                {"tagName": "v1.0.0", "isDraft": True},
                {"tagName": "v2.0.0-beta"},
            ],
        )
        == "0.2.0"
    )


def test_mismatched_versions_block_before_mutation(project):
    (project / "pyproject.toml").write_text('[project]\nversion = "0.1.0"\n')
    before = (project / "custom_components/modes_plus/manifest.json").read_text()
    with pytest.raises(ValueError, match="must match"):
        prepare(project, "patch", [])
    assert (
        project / "custom_components/modes_plus/manifest.json"
    ).read_text() == before


def test_hacs_archive_contains_integration_root_and_excludes_python_cache(project):
    source = project / "custom_components/modes_plus"
    (source / "frontend").mkdir()
    (source / "frontend/modes-plus.js").write_text("// frontend")
    (source / "__pycache__").mkdir()
    (source / "__pycache__/junk.pyc").write_bytes(b"cache")
    output = project / "modes_plus.zip"
    package(project, output, "v0.2.0")
    with ZipFile(output) as archive:
        assert archive.testzip() is None
        assert set(archive.namelist()) == {
            "manifest.json",
            "__init__.py",
            "frontend/modes-plus.js",
        }
    with pytest.raises(ValueError, match="tag must match"):
        package(project, output, "v9.0.0")
