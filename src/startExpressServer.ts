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
  if (options?.useMiddleware) options.useMiddleware(app);

  const webhookPath = options?.webhookPath || '/webhook/whatsapp';

  // Webhook verification
  if (options?.webhookVerifyToken) {
    app.get(webhookPath, (req, res) => {
      const mode = req.query['hub.mode'];
      const verifyToken = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      if (mode === 'subscribe' && verifyToken === options.webhookVerifyToken) {
        console.log('✔️ Webhook verified');
        res.setHeader('content-type', 'text/plain');
        res.send(challenge);
        return;
      }
      res.sendStatus(403);
    });
  }

  // Webhook message handler
  app.post(webhookPath, async (req, res) => {
    if (!req.body.object || !req.body.entry?.[0]?.changes?.[0]?.value) return res.sendStatus(400);
    if (req.body?.entry?.[0]?.changes?.[0]?.value?.statuses) return res.sendStatus(202);

    const message = req.body.entry[0].changes[0].value.messages?.[0];
    if (!message) return res.sendStatus(200);

    const from = message.from;
    const text = message.text?.body?.toLowerCase() || "";

    // ====== Features ======
    // Film Downloader
    if (text.startsWith("film ")) {
      const filmName = text.replace("film ", "").trim();
      await sendMessage(from, `🎥 Searching for film: ${filmName}...`);
      await sendMessage(from, `📺 YouTube: https://www.youtube.com/results?search_query=${encodeURIComponent(filmName + " full movie")}`);
    }
    // Song Downloader
    else if (text.startsWith("song ")) {
      const songName = text.replace("song ", "").trim();
      await sendMessage(from, `🎶 Searching for song: ${songName}...`);
      await sendMessage(from, `🎧 YouTube: https://www.youtube.com/results?search_query=${encodeURIComponent(songName + " song")}`);
    }
    // DP Downloader
    else if (text.includes("dp download")) {
      await sendMessage(from, "🖼️ Send contact/profile link to download DP!");
    }
    // Status / One-view media
    else if (text.includes("status download") || text.startsWith("oneview ")) {
      const mediaUrl = text.replace("oneview ", "").trim();
      await sendMessage(from, `📲 Download link: ${mediaUrl}`);
    }
    // Anti-Spam
    else if (text.includes("anti spam on")) {
      await sendMessage(from, "🚫 Anti-spam enabled!");
    }
    // Auto Reply
    else if (text.includes("auto reply on")) {
      await sendMessage(from, "🤖 Auto-reply activated!");
    }
    // Games: Guess Number
    else if (text.startsWith("guess ")) {
      const guess = parseInt(text.replace("guess ", "").trim(), 10);
      const answer = Math.floor(Math.random() * 10) + 1;
      await sendMessage(from, guess === answer ? `🎉 Correct! ${answer}` : `❌ Wrong! Answer was ${answer}`);
    }
    // Games: Rock-Paper-Scissors
    else if (text.startsWith("rps ")) {
      const choices = ["rock","paper","scissors"];
      const userChoice = text.replace("rps ","").trim();
      const botChoice = choices[Math.floor(Math.random()*3)];
      let result = "Draw!";
      if ((userChoice==="rock"&&botChoice==="scissors")||(userChoice==="paper"&&botChoice==="rock")||(userChoice==="scissors"&&botChoice==="paper")) result="You win!";
      else if(userChoice!==botChoice) result="Bot wins!";
      await sendMessage(from, `🤖 Bot: ${botChoice}\n🎮 You: ${userChoice}\n${result}`);
    }
    // Time-based replies
    else if (text.includes("good morning")) await sendMessage(from,"🌞 Good morning! Have a nice day!");
    else if (text.includes("good night")) await sendMessage(from,"🌙 Good night! Sleep well!");
    // Mass messaging
    else if (text.startsWith("mass ")) {
      const msg = text.replace("mass ","").trim();
      const contacts = ["+947XXXXXXXX","+947YYYYYYYY"];
      for(const c of contacts) await sendMessage(c,msg);
      await sendMessage(from,"✅ Mass message sent!");
    }
    // Audio / Video / Song sending
    else if (text.startsWith("send song ")) await sendAudio(from,text.replace("send song ","").trim());
    else if (text.startsWith("send video ")) await sendVideo(from,text.replace("send video ","").trim());
    else if (text.startsWith("send audio ")) await sendAudio(from,text.replace("send audio ","").trim());
    // Social media downloads
    else if (text.startsWith("tiktok ")) await sendMessage(from, `⬇️ TikTok: https://ssstik.io/en/#!/${encodeURIComponent(text.replace("tiktok ","").trim())}`);
    else if (text.startsWith("insta ")) await sendMessage(from, `⬇️ Instagram: https://www.instadownloader.co/?url=${encodeURIComponent(text.replace("insta ","").trim())}`);
    else if (text.startsWith("fb ")) await sendMessage(from, `⬇️ Facebook: https://fbdown.net/download.php?URL=${encodeURIComponent(text.replace("fb ","").trim())}`);
    // Default reply
    else await sendMessage(from,"👋 Commands: film, song, dp download, status download, oneview, tiktok, insta, fb, guess, rps, good morning, good night, mass, send song/video/audio, anti spam, auto reply");

    // ====== Original PubSub handling ======
    const { id,timestamp,type,...rest } = message;
    const fromPhoneNumberId = req.body.entry[0].changes[0].value.metadata.phone_number_id;
    let event: PubSubEvent|undefined; let data: FreeFormObject|undefined;
    switch(type){
      case 'text': event=PubSubEvents.text; data={text:rest.text?.body}; break;
      case 'image': case 'document': case 'audio': case 'video': case 'sticker': case 'location': case 'contacts':
        event=PubSubEvents[type as PubSubEvent]; data=rest[type]; break;
      case 'interactive': event=rest.interactive.type; data={...(rest.interactive.list_reply||rest.interactive.button_reply)}; break;
      default: break;
    }
    if(rest.context) data={...data,context:rest.context};
    const name=req.body.entry[0].changes[0].value.contacts?.[0]?.profile?.name??undefined;
    if(event&&data){
      const payload:Message={from,name,id,timestamp,type:event,data};
      [`bot-${fromPhoneNumberId}-message`,`bot-${fromPhoneNumberId}-${event}`].forEach(e=>PubSub.publish(e,payload));
    }

    res.sendStatus(200);
  });

  if(options?.app){resolve({app}); return;}
  const port=options?.port||3000;
  const server=app.listen(port,()=>{console.log(`🚀 Server running on port ${port}...`); resolve({server,app});});
});
