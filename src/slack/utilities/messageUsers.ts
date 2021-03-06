import { WebClient } from '@slack/web-api';
import logger from '../../logger';
import { DmOpenResult } from '../types';
import { Config } from '../../entities/config';

let token: string | null = null;

export default async function messageUsers(client: WebClient, users: string[], message: string): Promise<void> {
  token = token ?? (await Config.getValueAs('slackBotToken', 'string', false));
  const errors: { [userId: string]: Error }[] = [];
  for (let i = 0; i < users.length; i += 1) {
    const user = users[i];
    try {
      const dm = (await client.conversations.open({
        users: users[i],
      })) as DmOpenResult;

      await client.chat.postMessage({
        channel: dm.channel.id,
        text: message,
      });

      // Rate limiting for this behavior is capped at ~1 per second, but burst behavior is allowed
      await waitBeforeNextRequest(500);
    } catch (err) {
      errors.push({ [user]: err });
    }
  }

  if (errors.length) {
    logger.error(`Unable to send update to ${errors.length === users.length ? 'all' : 'some'} users:`, errors);
    throw new Error(`Unable to send update to ${errors.length === users.length ? 'all' : 'some'} users: ${JSON.stringify(errors)}`);
  }
}

async function waitBeforeNextRequest(delay: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delay));
}
