import * as core from '@actions/core'
import EdgeGrid from 'akamai-edgegrid'
import { pipe, map, filter, isEmpty, toArray } from '@fxts/core'

const checkValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch (error) {
    return false
  }
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const CLIENT_TOKEN: string = core.getInput('CLIENT_TOKEN')
    const CLIENT_SECRET: string = core.getInput('CLIENT_SECRET')
    const ACCESS_TOKEN: string = core.getInput('ACCESS_TOKEN')
    const BASE_URL: string = core.getInput('HOST')
    const URLS: string = core.getInput('URLS')

    console.log(URLS)
    core.debug(URLS)

    const cacheDeleteUrls = pipe(
      URLS.split('\n'),
      map(line => line.trim()),
      // TODO: `/` 와 같이 모든 경로를 포함할 수 있는 주소는 제거
      filter(checkValidUrl),
      filter(line => !isEmpty(line)),
      toArray
    )

    const eg = new EdgeGrid(CLIENT_TOKEN, CLIENT_SECRET, ACCESS_TOKEN, BASE_URL)
    eg.auth({
      path: '/ccu/v3/delete/url/production',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        objects: cacheDeleteUrls
      }
    })

    eg.send((error, response, body) => {
      console.group('response')
      console.log(error)
      console.log(response)
      console.log(body)
      console.groupEnd()
    })

    core.debug(CLIENT_SECRET);

    // TODO: Summary
    // NOTE: https://www.res.kurly.com/json/1234.json1234123 와 같이 실제 존재하지 않는 객체에 대한 요청도 일단 들어감
    /**
     * TODO: 여러 오브젝트를 한번에 퍼지하는 경우, 객체 수를 알려주지 않는다.
     * |       httpStatus: 201,
     * |       detail: 'Request accepted',
     * |       supportId: 'edup-WQQ65Lb2QAKsHVRhKxUa9R',
     * |       purgeId: 'edup-WQQ65Lb2QAKsHVRhKxUa9R',
     * |       estimatedSeconds: 5
     */

    /*
    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.debug(`Waiting ${ms} milliseconds ...`)

    // Log the current timestamp, wait, then log the new timestamp
    core.debug(new Date().toTimeString())
    await wait(parseInt(ms, 10))
    core.debug(new Date().toTimeString())

    // Set outputs for other workflow steps to use
     */
    core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
