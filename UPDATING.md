# Updating the upstream version

LNDg ships from a single source: the upstream-published `ghcr.io/cryptosharks131/lndg` container image, tagged `v<version>` to match the GitHub release.

## Determining the upstream version

- **LNDg** ([cryptosharks131/lndg](https://github.com/cryptosharks131/lndg)) — latest GitHub release:

  ```sh
  gh release view -R cryptosharks131/lndg --json tagName -q .tagName
  ```

  Pinned in `startos/manifest/index.ts` as `images.lndg.source.dockerTag` (`ghcr.io/cryptosharks131/lndg:v<version>`).

## Applying the bump

- **`startos/manifest/index.ts`** — set `images.lndg.source.dockerTag` to `ghcr.io/cryptosharks131/lndg:v<new version>`.
