import {explore} from 'source-map-explorer'
import {ExploreResult} from 'source-map-explorer/lib/types'
import * as core from '@actions/core'
import {SupportedFileEndings} from './enums'

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
    core.debug(`concatenated path: ${path}/**/*.js`)
    const createdBundle = await explore(
      [`${path}/**/*.js`, `${path}/**/*.css`],
      {
        gzip: true,
        output: {format: 'json', filename: `${branch}-react-bundle-logs.json`}
      }
    )

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

const getTotalBytes = (res: ExploreResult): string => {
  let countedBytes = 0

  for (const bundle of res.bundles) {
    countedBytes = countedBytes + bundle.totalBytes
  }

  return humanFileSize(countedBytes, true)
}

interface parsedBundleOutput {
  title: string
  totalSize: string
  bundleLogs: string[]
}

const getAllOfBundleTypes = (
  res: ExploreResult,
  endsWith: SupportedFileEndings,
  title: string
): parsedBundleOutput => {
  const collectedBundles: {
    name: string
    size: string
  }[] = []

  let totalForParticularBundles = 0

  for (const bundle of res.bundles) {
    if (bundle.bundleName.endsWith(endsWith)) {
      const splitName = bundle.bundleName.split('/')

      collectedBundles.push({
        name: splitName[splitName.length - 1],
        size: humanFileSize(bundle.totalBytes, true)
      })

      totalForParticularBundles = totalForParticularBundles + bundle.totalBytes
    }
  }

  return {
    title,
    totalSize: humanFileSize(totalForParticularBundles, true),
    bundleLogs: collectedBundles.map(el => `${el.name} (${el.size})`)
  }
}

interface BundleStats {
  totalBytes: string
  jsBundlesAndSizes: parsedBundleOutput
  cssBundlesAndSizes: parsedBundleOutput
}

/**
 * Creates stats using an explore result.
 * @param res
 */
export const createStats = (res: ExploreResult): BundleStats => {
  return {
    totalBytes: getTotalBytes(res),
    jsBundlesAndSizes: getAllOfBundleTypes(
      res,
      SupportedFileEndings.CSS,
      'CSS Bundles'
    ),
    cssBundlesAndSizes: getAllOfBundleTypes(
      res,
      SupportedFileEndings.JS,
      'Javascript Bundles'
    )
  }
}

export const printTextStats = (stats: BundleStats): void => {
  core.info(`
    ✅ Your Bundle has been analyzed and the following has been logged: \n
  `)
  core.info(`🔥Total Bytes: ${stats.totalBytes}\n`)
  core.info(`
    Javascript Resources (Total Bytes - ${stats.jsBundlesAndSizes.totalSize}): \n
  `)
  for (const jsStats of stats.jsBundlesAndSizes.bundleLogs) {
    core.info(`
  ${jsStats}
  `)
  }
  core.info('\n')

  core.info(`
    Css Resources (Total Bytes - ${stats.cssBundlesAndSizes.totalSize}): \n
  `)
  for (const cssStats of stats.cssBundlesAndSizes.bundleLogs) {
    core.info(`
  ${cssStats}
  `)
  }
}
