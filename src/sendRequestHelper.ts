import { sendRequestHelper, SendMessageResult } from './sendRequestHelper';

// ================================
// 🔧 Direct configuration
// ================================
const FROM_PHONE_NUMBER_ID = '883684478154396'; // <-- ඔබගේ WhatsApp Number ID
const ACCESS_TOKEN = 'EAAhlMhNVkDkBP3EZApVGZClsy2eyEwwMeg2d1qswRxX7NZAHj9pNZBQbwXunS26lRAWZA3GCqcMJrvqkQZCkZA3JXdrHK0mB436Thh86xtLQ2vYaQtZBCQSB7uGW8e8u5CRLjXhVlyXraoSafs7ZCpZAkS7jP1rJ9AQs1RxZCsUp39jhX6iXkSUeZCRtHa86DnSjQ4LpxwZDZD'; // <-- ඔබගේ Token එක
const API_VERSION = 'v14.0';

// Initialize helper
const sendRequest = sendRequestHelper(FROM_PHONE_NUMBER_ID, ACCESS_TOKEN, API_VERSION);

// ================================
// ✉️ Send Text Message
// ================================
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

// ================================
// 🔊 Send Audio File
// ================================
export async function sendAudio(to: string, audioUrl: string) {
  try {
    const data = {
      messaging_product: 'whatsapp',
      to,
      type: 'audio',
      audio: { link: audioUrl },
    };
    const result: SendMessageResult = await sendRequest(data);
    console.log(`✅ Audio sent to ${to} (WhatsApp ID: ${result.whatsappId})`);
    return result;
  } catch (err) {
    console.error('❌ Failed to send audio:', err);
  }
}

// ================================
// 🎥 Send Video File
// ================================
export async function sendVideo(to: string, videoUrl: string) {
  try {
    const data = {
      messaging_product: 'whatsapp',
      to,
      type: 'video',
      video: { link: videoUrl },
    };
    const result: SendMessageResult = await sendRequest(data);
    console.log(`✅ Video sent to ${to} (WhatsApp ID: ${result.whatsappId})`);
    return result;
  } catch (err) {
    console.error('❌ Failed to send video:', err);
  }
}
