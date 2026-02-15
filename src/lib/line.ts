import { messagingApi } from "@line/bot-sdk";

// Initialize LINE Messaging API client
const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || "",
});

export default client;
