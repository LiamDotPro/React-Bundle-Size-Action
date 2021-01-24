import {context} from '@actions/github'
import * as core from '@actions/core'
import {createBundle, createStats, getRefName, humanFileSize} from './helpers'
import {create} from '@actions/artifact'
import {ExploreResult} from 'source-map-explorer/lib/types'
import fs from 'fs'

export const pr = async (): Promise<void> => {
  try {
    // Try and find a log to compare it too using the pull request destination
    // get pull request target name:
    const targetBranchName = context.payload.pull_request?.base.ref
    const currentBranchName = context.payload.pull_request?.head.ref

    core.info(
      `Pull request branching: ${currentBranchName} -> ${targetBranchName}`
    )

    if (!targetBranchName) {
      return core.error(
        'The branch could name not be detected, does the target branch name contain invalid chars?'
      )
    }

    if (!process.env.GITHUB_REF) {
      return core.error(
        'The branch could not be detected, are we running in a CI?'
      )
    }

    // Find the branch were currently on
    const branch = getRefName(process.env.GITHUB_REF)

    if (!branch) {
      return core.error(
        'The branch could name not be detected, does our branch name contain invalid chars?'
      )
    }

    // Read in an input for the path in the case the bundle isn't collected directly in the root.
    const path = core.getInput('path')

    core.debug(`Read in the following path: "${path}"`)

    let outcomeBundle: false | ExploreResult

    // No path has been specified, lets presume the build is located directly in the root.
    if (!path) {
      outcomeBundle = await createBundle(branch)
    } else {
      outcomeBundle = await createBundle(branch, path)
    }

    if (!outcomeBundle) {
      return core.error(`Couldn't read in the bundle..`)
    }

    // Create an artifact client to download a different artifact for parsing
    const artifactClient = create()

    try {
      const foundArtifact = await artifactClient.downloadArtifact(
        targetBranchName,
        './'
      )

      if (!foundArtifact) {
        // We couldn't find a corresponding branch name, this may mean that the target branch has never previously been built..
        // At this point we can just set the output.

        core.info('Could not download an artifact..')

        core.debug(
          '♻️ Set the bundle size without specifying what it was against!'
        )
      }

      const readInStatsFile = await fs.promises.readFile(
        `./${targetBranchName}-react-bundle-logs.json`,
        {encoding: 'utf8'}
      )

      // Try and read in our downloaded bundle for comparison
      const targetBundleStats = createStats(
        JSON.parse(readInStatsFile) as ExploreResult
      )

      // get stats for our current bundle
      const currentBundleStats = createStats(outcomeBundle)

      const bytesChange = humanFileSize(
        currentBundleStats.totalBytesNumber - targetBundleStats.totalBytesNumber
      )

      core.info(`This pull request resents a change of ${bytesChange}`)
    } catch (e) {
      core.info(e)
      core.info('Trying to find an artifact threw an error..')
      core.info(
        '♻️ Set the bundle size without specifying what it was against!'
      )
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}
