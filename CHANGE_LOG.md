# Changelog

## [0.2.6] - 2025-09-21
### Changed
- Pre-commit hook now runs format, lint, coverage, build, and smoke (`node scripts/smoke.mjs`) to block invalid deployments.

## [0.2.5] - 2025-09-21
### Changed
- Pre-commit hook now fails unless format, lint, coverage, build, and smoke (node scripts/smoke.mjs) all succeed.

### Changed
- Removed the post-commit tag automation to keep release tagging manual.

## [0.2.3] - 2025-09-21
### Changed
- Updated the publish workflow configuration to accommodate the latest deployment changes.

## [0.2.2] - 2025-09-21
### Added
- Added a lightweight smoke test that runs the manager against a stubbed DataSource to ensure lifecycle APIs behave without a real database.
### Changed
- Release documentation now references `npm version <type>` followed by `git push --follow-tags`.

## [0.2.1] - 2025-09-21
### Changed
- Removed the `release` npm script and updated documentation to instruct running `npm version <type>` followed by `git push --follow-tags`.

## [0.2.0] - 2025-09-21
- Implement `TypeOrmManager` with configuration, lazy initialization, and
  migration helpers.
- Provide DI integration via `typeOrmModule` and `useTypeOrm()` plus a
  standalone `createManagedDataSource()` utility.
- Add comprehensive Jest suite, fake data source fixtures, and documentation.

## [0.1.0] - 2025-09-21
- Initial scaffolding generated with `cw.helper.package.generator`.
