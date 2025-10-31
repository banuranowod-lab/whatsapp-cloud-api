import { sendRequestHelper, SendMessageResult } from './sendRequestHelper';
import dotenv from 'dotenv';
dotenv.config();

const FROM_PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || '';
const ACCESS_TOKEN = process.env.WHATSAPP_TOKEN || '';
const API_VERSION = 'v14.0';

const sendRequest = sendRequestHelper(FROM_PHONE_NUMBER_ID, ACCESS_TOKEN, API_VERSION);

export async function sendMessage(to: string, text: string) {
  try {
    const data = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    };
    const result: SendMessageResult = await sendRequest(data);
    console.log(`✅ Message sent to ${to} (WhatsApp ID: ${result.whatsappId})`);
    return result;
  } catch (err) {
    console.error('❌ Failed to send message:', err);
  }
}

export async function sendAudio(to: string, audioUrl: string) {
  try {
    const data = {
      messaging_product: 'whatsapp',
      to,
      type: 'audio',
      audio: { link: audioUrl },
    };
    const result: SendMessageResult = await sendRequest(data);
    console.log(`✅ Audio sent to ${to}`);
    return result;
  } catch (err) {
    console.error('❌ Failed to send audio:', err);
  }
}

export async function sendVideo(to: string, videoUrl: string) {
  try {
    const data = {
      messaging_product: 'whatsapp',
      to,
      type: 'video',
      video: { link: videoUrl },
    };
    const result: SendMessageResult = await sendRequest(data);
    console.log(`✅ Video sent to ${to}`);
    return result;
  } catch (err) {
    console.error('❌ Failed to send video:', err);
  }
    }
