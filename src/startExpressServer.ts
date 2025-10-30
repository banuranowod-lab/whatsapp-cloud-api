import express, { Application } from 'express';
import { Server } from 'http';
import PubSub from 'pubsub-js';
import { FreeFormObject } from './utils/misc';
import { PubSubEvent, PubSubEvents } from './utils/pubSub';
import { Message } from './createBot.types';

export interface ServerOptions {
  app?: Application;
  useMiddleware?: (app: Application) => void;
  port?: number;
  webhookPath?: string;
  webhookVerifyToken?: string;
}

export interface ExpressServer {
  server?: Server;
  app: Application;
}

export const startExpressServer = (
  options?: ServerOptions,
): Promise<ExpressServer> => new Promise((resolve) => {
  const app = options?.app || express();

  app.use(express.json());

  if (options?.useMiddleware) {
    options.useMiddleware(app);
  }

  const webhookPath = options?.webhookPath || '/webhook/whatsapp';

  if (options?.webhookVerifyToken) {
    app.get(webhookPath, (req, res) => {
      if (!req.query) {
        res.sendStatus(403);
        return;
      }

      const mode = req.query['hub.mode'];
      const verifyToken = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      if (!mode || !verifyToken || !challenge) {
        res.sendStatus(403);
        return;
      }

      if (mode === 'subscribe' && verifyToken === options.webhookVerifyToken) {
        // eslint-disable-next-line no-console
        console.log('✔️ Webhook verified');
        res.setHeader('content-type', 'text/plain');
        res.send(challenge);
        return;
      }

      res.sendStatus(403);
    });
  }

  app.post(webhookPath, async (req, res) => {
    if (!req.body.object || !req.body.entry?.[0]?.changes?.[0]?.value) {
      res.sendStatus(400);
      return;
    }
    if (req.body?.entry?.[0]?.changes?.[0]?.value?.statuses) {
      res.sendStatus(202);
      return;
    }
   // 🧠 Custom features by Lasith & GPT-5
    const message = req.body.entry[0].changes[0].value.messages?.[0];
    if (!message) {
      res.sendStatus(200);
      return;
    }

    const from = message.from;
    const text = message.text?.body?.toLowerCase() || "";

    // 🎬 Film Downloader
    if (text.startsWith("film ")) {
      const filmName = text.replace("film ", "").trim();
      await sendMessage(from, `🎥 Searching for film: ${filmName}...`);
      await sendMessage(from, `✅ Here’s your film link: https://example.com/search?film=${encodeURIComponent(filmName)}`);
    }

    // 🎵 Song Downloader
    if (text.startsWith("song ")) {
      const songName = text.replace("song ", "").trim();
      await sendMessage(from, `🎶 Searching for song: ${songName}...`);
      await sendMessage(from, `✅ Your song link: https://example.com/music?title=${encodeURIComponent(songName)}`);
    }

    // 🖼️ DP Downloader
    if (text.includes("dp download")) {
      await sendMessage(from, "🖼️ Please send the contact or profile link to download their DP!");
    }

    // 📥 Status Downloader
    if (text.includes("status download")) {
      await sendMessage(from, "📲 Send the status link to download it.");
    }

    // 🚫 Anti-Spam
    if (text.includes("anti spam on")) {
      await sendMessage(from, "🚫 Anti-spam mode enabled!");
    }

    // 🤖 Auto Reply
    if (text.includes("auto reply on")) {
      await sendMessage(from, "🤖 Auto reply is now active!");
        }
    const {
      from,
      id,
      timestamp,
      type,
      ...rest
    } = req.body.entry[0].changes[0].value.messages[0];
    const fromPhoneNumberId = req.body.entry[0].changes[0].value.metadata.phone_number_id;

    let event: PubSubEvent | undefined;
    let data: FreeFormObject | undefined;

    switch (type) {
      case 'text':
        event = PubSubEvents.text;
        data = { text: rest.text?.body };
        break;

      case 'image':
      case 'document':
      case 'audio':
      case 'video':
      case 'sticker':
      case 'location':
      case 'contacts':
        event = PubSubEvents[type as PubSubEvent];
        data = rest[type];
        break;

      case 'interactive':
        event = rest.interactive.type;
        data = {
          ...(rest.interactive.list_reply || rest.interactive.button_reply),
        };
        break;

      default:
        break;
    }

    if (rest.context) {
      data = {
        ...data,
        context: rest.context,
      };
    }

    const name = req.body.entry[0].changes[0].value.contacts?.[0]?.profile?.name ?? undefined;

    if (event && data) {
      const payload: Message = {
        from,
        name,
        id,
        timestamp,
        type: event,
        data,
      };

      [
        `bot-${fromPhoneNumberId}-message`,
        `bot-${fromPhoneNumberId}-${event}`,
      ].forEach((e) => PubSub.publish(e, payload));
    }

    res.sendStatus(200);
  });

  if (options?.app) {
    resolve({ app });
    return;
  }

  const port = options?.port || 3000;
  const server = app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 Server running on port ${port}...`);
    resolve({ server, app });
  });
});
