# Direct download utility (src/utils/directDownload.ts)

This document explains the direct download helper which allows local, one-off downloads of Steam Workshop items using DepotDownloader.

## Purpose

- Provide a CLI-friendly function to download a Steam Workshop item directly to the local machine using a Steam account stored in the application's database.
- Optionally create a ZIP archive of the downloaded content and clean up temporary files.
- Give informative progress messages based on DepotDownloader output.

## Main function

- `directDownload(options: DirectDownloadOptions): Promise<DirectDownloadResult>`
  - Options:
    - `urlOrId: string` — Steam Workshop URL or numeric ID.
    - `accountName: string` — Name of the Steam account stored in the database to use for authentication.
    - `outputPath: string` — Directory where final output (zip or folder) will be placed.
    - `createZip?: boolean` — Defaults to true. Whether to produce a ZIP archive.
    - `cleanup?: boolean` — Defaults to true. Whether to remove the extracted files after zipping.
    - `onProgress?: (message: string) => void` — Optional progress callback.
  - Returns an object with:
    - `outputPath: string` — Final path (zip or directory) returned to caller.
    - `zipPath?: string` — If zipped, the path to the archive.
    - `size?: string` — Human-friendly size of the download.
    - `duration: number` — Milliseconds taken.

## Implementation details

1. Extracts a numeric Workshop ID from the input (regex for 8-12 digits). Fails early if none found.
2. Reads Steam account credentials from the database using Prisma and decrypts the stored password using `decryptPassword` from `src/utils/crypto.ts`.
3. Creates a temporary work directory under the OS temp folder and constructs a target directory using a UUID.
4. Spawns the DepotDownloader binary with arguments to download the specified pubfile to the temp directory.
5. Streams DepotDownloader's stdout/stderr, parsing lines to present progress, authentication messages, and status updates.
   - It detects percentage-like lines to update a single-line progress indicator.
   - It recognizes a handful of textual markers to surface friendlier messages (connecting, authenticating, got depot key, etc.).
6. On completion the tool discovers the actual content directory (DepotDownloader sometimes nests content), calculates size, moves the content to the configured `outputPath`, and optionally zips it using `archiver`.
7. Cleans up temporary directories and returns a `DirectDownloadResult`.

## Error handling

- If DepotDownloader exits with a non-zero code, the function removes the temporary directory, logs collected stdout/stderr and throws an Error indicating failure.
- If the specified Steam account is not found in the database, the function throws an Error describing the missing account.
- Input validation errors (invalid URL/ID) are thrown early.

## Security & operational notes

- The function fetches Steam credentials from the database and decrypts passwords — ensure that the calling user has the right privileges and that logs do not leak secrets.
- When producing ZIP archives, ensure there is sufficient disk space and validate the archive before sending or storing it in public locations.
- Use `createZip=false` to skip zipping if you only need extracted files.
- This helper is designed for direct, on-demand use (local CLI). For server-side downloads prefer the `downloadService` orchestration which respects concurrency, rate limiting, and retention policies.

## Example usage (script)

```ts
import { directDownload } from "../src/utils/directDownload";

(async () => {
  try {
    const result = await directDownload({
      urlOrId: "https://steamcommunity.com/sharedfiles/filedetails/?id=123456789",
      accountName: "default",
      outputPath: "./downloads",
      createZip: true,
      cleanup: true,
    });

    console.log(`Download finished in ${result.duration}ms, size ${result.size}, output: ${result.outputPath}`);
  } catch (err) {
    console.error("Direct download failed:", err);
  }
})();
```

## Edge cases & enhancements

- ID extraction: The regex picks the first 8–12 digit group it finds. This may accidentally match unrelated digits in some URLs — validate inputs upstream where possible.
- More robust progress parsing: DepotDownloader output is free-text; matching is heuristic. If you need structured progress, modify the binary invocation or wrap DepotDownloader output parsing to handle more cases.
- Parallel downloads: This utility is single-shot. For bulk downloads, use the server-side `downloadService` which handles queuing, retries, and concurrency.
- Tests: Add unit tests for `extractId`, `formatFileSize`, and `getDirectorySize` to ensure cross-platform behavior.

---

Ready for the next file. Pick one and I'll analyze it and add a matching doc in `docs/`.
