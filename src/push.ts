import * as core from '@actions/core'
import {createBundle, getRefName} from './helpers'
import {create, UploadOptions} from '@actions/artifact'

export const push = async (): Promise<void> => {
  if (!process.env.GITHUB_REF) {
    return core.error(
      'The branch could not be detected, are we running in a CI?'
    )
  }

  // Find the branch were currently on
  const branch = getRefName(process.env.GITHUB_REF)

  if (!branch) {
    return core.error(`Couldn't extract the branch name`)
  }

  // Read in an input for the path in the case the bundle isn't collected directly in the root.
  const path = core.getInput('path')

  let outcomeBundle

  // No path has been specified, lets presume the build is located directly in the root.
  if (!path) {
    outcomeBundle = await createBundle(branch)
  } else {
    outcomeBundle = await createBundle(branch, path)
  }

  // For the moment lets bundle and stringify the output..
  core.debug(JSON.stringify(outcomeBundle))

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

    core.debug(JSON.stringify(uploadResponse))
  }
}
