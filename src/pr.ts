import {context} from '@actions/github'
import * as core from '@actions/core'
import {getRefName} from './helpers'
import {explore} from 'source-map-explorer'
import {create, UploadOptions} from '@actions/artifact'

export const pr = async (): Promise<void> => {
  try {
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

    // No path has been specified, lets presume the build is located directly in the root.
    if (!path) {
      const outcomeBundle = await explore('./build/static/**/*.(js|css)', {
        output: {format: 'json', filename: `${branch}-react-bundle-logs.json`}
      })

      if (outcomeBundle.bundles.length === 0) {
        return core.error('The build output folder did not contain any files')
      }
    } else {
      const outcomeBundle = await explore(
        `${path}/build/static/**/*.(js|css)`,
        {
          output: {format: 'json', filename: `${branch}-react-bundle-logs.json`}
        }
      )

      if (outcomeBundle.bundles.length === 0) {
        return core.error('The build output folder did not contain any files')
      }
    }

    // Create an artifact client to save current log
    const artifactClient = create()

    const options: UploadOptions = {
      continueOnError: false
    }

    // Save a current log of what was built
    const uploadResponse = await artifactClient.uploadArtifact(
      branch,
      [`./${branch}-react-bundle-logs.json`],
      './',
      options
    )

    if (uploadResponse) {
      core.debug(
        '⭐ A react bundle log for this build has been saved using your branch name!'
      )
    }

    // Try and find a log to compare it too using the pull request destination
    // get pull request target name:
    const targetBranchName = getRefName(context.payload.pull_request?.head.ref)

    if (!targetBranchName) {
      return core.error(
        'The branch could name not be detected, does the target branch name contain invalid chars?'
      )
    }

    try {
      const foundArtifact = await artifactClient.downloadArtifact(
        `./${targetBranchName}-react-bundle-logs.json`
      )

      if (!foundArtifact) {
        // We couldn't find a corresponding branch name, this may mean that the target branch has never previously been built..
        // At this point we can just set the output.

        return core.debug(
          '⭐ Set the bundle size without specifying what it was against!'
        )
      }
    } catch (e) {
      core.debug('Trying to find an artifact threw an error..')
      return core.debug(
        '⭐ Set the bundle size without specifying what it was against!'
      )
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}
