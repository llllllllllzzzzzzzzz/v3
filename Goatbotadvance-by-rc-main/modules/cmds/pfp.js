const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "pfp",
    aliases: ["pp"],
    version: "0.0.1",
    author: "𝐒𝐚𝐆𝐨𝐫",
    countDown: 3,
    role: 0,
    shortDescription: "𝐒𝐡𝐨𝐰 𝐩𝐫𝐨𝐟𝐢𝐥𝐞 𝐩𝐢𝐜𝐭𝐮𝐫𝐞",
    longDescription: "𝐩𝐢𝐜𝐭𝐮𝐫𝐞 𝐨𝐟 𝐲𝐨𝐮𝐫𝐬𝐞𝐥𝐟 𝐨𝐫 𝐚𝐧𝐲 𝐮𝐬𝐞𝐫",
    category: "image",
    guide: {
      en: "{pn}[@tag | reply | uid]"
    }
  },

  onStart: async function ({ event, message, args, usersData }) {
    try {
      let targetID =
        (event.type === "message_reply" && event.messageReply?.senderID) ||
        (event.mentions && Object.keys(event.mentions)[0]) ||
        (args[0] && !isNaN(args[0]) && args[0]) ||
        event.senderID;

      const name = await usersData.getName(targetID).catch(() => "Unknown User");

      const avatarURL = await usersData.getAvatarUrl(targetID);

      const replyText = `
✿•≫────•『PP』•────≪•✿
𝐇𝐞𝐫𝐞 𝐢𝐬 𝐭𝐡𝐞 𝐩𝐫𝐨𝐟𝐢𝐥𝐞 𝐩𝐢𝐜𝐭𝐮𝐫𝐞 🌸 
𝐍𝐞 𝐭𝐨𝐫 𝐩𝐢𝐜: 🙂 ${name}
𝐈𝐝: ${targetID}
✿•≫───────────────≪•✿
`;

      return message.reply({
        body: replyText,
        attachment: await global.utils.getStreamFromURL(avatarURL)
      });

    } catch (err) {
      console.error("𝐜𝐨𝐦𝐦𝐚𝐧𝐝 𝐞𝐫𝐫𝐨𝐫:", err);

      const errorText = `
✿•≫────•『PP』•────≪•✿
❌ 𝐂𝐨𝐮𝐥𝐝 𝐧𝐨𝐭 𝐟𝐞𝐭𝐜𝐡 𝐩𝐢𝐜𝐭𝐮𝐫𝐞.
⛔ 𝐢𝐧𝐯𝐚𝐥𝐢𝐝 𝐨𝐫 𝐩𝐫𝐢𝐯𝐚𝐜𝐲 𝐛𝐥𝐨𝐜𝐤𝐞𝐝.
✿•≫───────────────≪•✿
`;

      return message.reply(errorText);
    }
  }
};
