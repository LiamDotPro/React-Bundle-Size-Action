import {explore} from 'source-map-explorer'
import {ExploreResult} from 'source-map-explorer/lib/types'
import * as core from '@actions/core'

/**
 * Format bytes as human-readable text.
 *
 * @param bytes Number of bytes.
 * @param si True to use metric (SI) units, aka powers of 1000. False to use
 *           binary (IEC), aka powers of 1024.
 * @param dp Number of decimal places to display.
 *
 * @return Formatted string.
 */
export const humanFileSize = (bytes: number, si = false, dp = 1): string => {
  const thresh = si ? 1000 : 1024

  if (Math.abs(bytes) < thresh) {
    return `${bytes} B`
  }

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
  let u = -1
  const r = 10 ** dp

  do {
    bytes /= thresh
    ++u
  } while (
    Math.round(Math.abs(bytes) * r) / r >= thresh &&
    u < units.length - 1
  )

  return `${bytes.toFixed(dp)} ${units[u]}`
}

/**
 * Get the ref name from the ref string.
 * @param {string} ref
 * @return {string} The ref name.
 */
export const getRefName = (ref: string): string | null => {
  return ref ? ref.split('/').slice(2).join('/') : null
}

export const createBundle = async (
  branch: string,
  path = './build/static'
): Promise<ExploreResult | false> => {
  try {
    const createdBundle = await explore(`${path}/**/*.(js|css)`, {
      output: {format: 'json', filename: `${branch}-react-bundle-logs.json`}
    })

    if (createdBundle.bundles.length === 0) {
      core.error(
        `Couldn't parse any assets from the build, or build wasn't found..`
      )
    }

    return createdBundle
  } catch (e) {
    core.error(e)
    return false
  }
}
