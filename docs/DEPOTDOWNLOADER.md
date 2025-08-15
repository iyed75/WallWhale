# DepotDownloader helper (src/utils/depotDownloader.ts)

This document explains the helper utilities that locate and validate the DepotDownloader binary used to fetch Steam Workshop content.

## Purpose

- Locate the DepotDownloader binary for the current platform.
- Provide platform-aware defaults and helpful error messages when the binary cannot be found.
- Offer convenience helpers used by the direct-download tooling and other parts of the system.

## Exported functions

- `getDepotDownloaderPath(): string`
  - Returns the absolute or configured path to the `DepotDownloader` binary.
  - Behavior:
    - If `env.DEPOTDOWNLOADER_PATH` exists and points to a file, returns it.
    - If `env.DEPOTDOWNLOADER_PATH` points to a directory, it will look inside for the correct binary name (`DepotDownloaderMod.exe` on Windows, `DepotDownloaderMod` on POSIX).
    - Otherwise, it constructs a default path relative to `process.cwd()` at `./DepotDownloaderMod/<binary>` and verifies existence.
    - If the binary cannot be found at the resolved location, it throws a clear Error instructing the user to run the setup wizard.

- `isDepotDownloaderAvailable(): boolean`
  - Returns `true` if `getDepotDownloaderPath()` succeeds; otherwise `false`.
  - Useful for feature-detection or graceful degradation.

- `getDepotDownloaderBinaryName(): string`
  - Returns the expected binary filename for the current platform (Windows includes `.exe`).

- `getDefaultDepotDownloaderPath(isDocker = false): string`
  - Returns the default path for Docker (`/app/DepotDownloaderMod/<binary>`) or for local runs (`./DepotDownloaderMod/<binary>`).

## Notes & operational guidance

- Installation: The setup wizard should place the binary in `DepotDownloaderMod/` under the project root, or you may set `DEPOTDOWNLOADER_PATH` to a custom location.
- Docker: When running in Docker, use the `isDocker` flag or set `DEPOTDOWNLOADER_PATH` to the container path (commonly `/app/DepotDownloaderMod/<binary>`).
- Permissions: Ensure the binary has execute permissions on non-Windows platforms.
- Detecting problems: The helper throws a helpful error if the binary is absent — catch this in CLI or service startup and show migration/setup instructions.

## Example

```ts
import { getDepotDownloaderPath, isDepotDownloaderAvailable } from "../src/utils/depotDownloader";

if (!isDepotDownloaderAvailable()) {
  console.error("DepotDownloader not available. Run 'npm run setup' to install the required binary.");
  process.exit(1);
}

const ddPath = getDepotDownloaderPath();
console.log(`Using DepotDownloader at: ${ddPath}`);
```

## Where this is used

- `src/utils/directDownload.ts` uses `getDepotDownloaderPath()` to spawn the binary.
- Other scripts that orchestrate downloading may also use these helpers to validate local tooling.

---

Want me to also add a small `docs/SETUP.md` snippet that instructs how to install DepotDownloader on Windows/Linux/macOS and how to set `DEPOTDOWNLOADER_PATH`? I can draft that next.
