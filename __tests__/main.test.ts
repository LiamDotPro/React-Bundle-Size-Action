// shows how the runner will run a javascript action with env / stdout protocol
import {createStats} from '../src/helpers'
import {explore} from 'source-map-explorer'

test('Should build analytics from a build command', async () => {
  // Create bundle from local repo and
  const result = createStats(
    await explore([`./build/static/**/*.js`, `./build/static/**/*.css`], {
      gzip: true
    })
  )

  expect(result.totalBytes).toBe('275.4 kB')
  expect(result.jsBundlesAndSizes.totalSize).toBe('254.1 kB')
  expect(result.jsBundlesAndSizes.bundleLogs.length).toBeGreaterThan(1)
})
