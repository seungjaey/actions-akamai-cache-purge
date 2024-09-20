import * as core from '@actions/core';
import EdgeGrid from 'akamai-edgegrid';
import { pipe, map, filter, isEmpty, isNil, toArray, negate, some } from '@fxts/core';

const ACTION_NAME = 'actions-akamai-cache-purge';

const isNotEmpty = negate(isEmpty);

const trimLine = (line: string): string => line.trim();

const createErrorMessage = (msg: string): string => `[${ACTION_NAME}] ${msg}`;

const checkValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const sendInvalidRequest = async (eg: EdgeGrid, urls: string[]): Promise<string | undefined> =>
  new Promise((resolve, reject) => {
    try {
      eg.auth({
        path: '/ccu/v3/delete/url/production',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          objects: urls,
        },
      });
      eg.send((error, _, body) => {
        if (error) {
          reject(new Error(createErrorMessage('Fail to request')));
          return;
        }
        resolve(body);
      });
    } catch (error) {
      reject(error);
    }
  });

export async function run(): Promise<void> {
  try {
    const CLIENT_TOKEN: string = core.getInput('CLIENT_TOKEN');
    const CLIENT_SECRET: string = core.getInput('CLIENT_SECRET');
    const ACCESS_TOKEN: string = core.getInput('ACCESS_TOKEN');
    const BASE_URL: string = core.getInput('HOST');
    const URLS: string = core.getInput('URLS');
    const isInvalidInput = some(
      (input) => isNil(input) || isEmpty(input),
      [CLIENT_TOKEN, CLIENT_SECRET, ACCESS_TOKEN, BASE_URL, URLS],
    );

    if (isInvalidInput) {
      throw new Error(createErrorMessage('invalid input'));
    }

    const deleteUrls = pipe(URLS.split('\n'), map(trimLine), filter(checkValidUrl), filter(isNotEmpty), toArray);
    const eg = new EdgeGrid(CLIENT_TOKEN, CLIENT_SECRET, ACCESS_TOKEN, BASE_URL);
    const deleteResult = await sendInvalidRequest(eg, deleteUrls);

    core.debug('raw response body');
    core.debug(deleteResult || 'Empty response body');

    core.summary.addHeading(`[${ACTION_NAME}]`).addTable([
      [
        {
          data: 'url',
          header: true,
        },
      ],
      ...pipe(
        deleteUrls,
        map((url) => [url]),
        toArray,
      ),
    ]);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}
