import * as core from '@actions/core'
import {context} from '@actions/github'
import {pr} from './pr'
import {push} from './push'

async function run(): Promise<void> {
  try {
    /**
     * Upon entry we need to figure out if were running in a push or pull request mode.
     *
     * Push: When pushing were presuming you accepted a pull request onto X Branch.
     * Pull Request: When making a pull request were presuming you also want stats against what changed in the bundle size..
     */
    if (context.eventName === 'push') {
      core.info(`👷 Push event detected, logging bundle results to console!`)
      return push()
    }

    if (context.eventName === 'pull_request') {
      core.info(
        `👌 Pull Request event detected, logging bundle results to pull request!`
      )
      return pr()
    }
  } catch (e) {
    core.debug(
      'Something went wrong while trying to assign this kind of action..'
    )
  }
}

run()
