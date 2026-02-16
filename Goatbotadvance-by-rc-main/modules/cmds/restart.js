const fs = require("fs-extra");
const os = require("os");

module.exports = {
  config: {
    name: "restart",
    version: "1.2",
    author: "NTKhang", // updated by SaGor 
    countDown: 5,
    role: 2,
    description: {
      vi: "Khởi động lại bot",
      en: "Restart bot"
    },
    category: "admin",
    guide: {
      vi: "   {pn}: Khởi động lại bot",
      en: "   {pn}: Restart bot"
    }
  },

  langs: {
    vi: {
      restartting: "🔄 | Đang khởi động lại bot..."
    },
    en: {
      restartting: "🔄 | 𝗕𝗯𝘆 𝗥𝗲𝘀𝘁𝗮𝗿𝘁𝗶𝗻𝗴 𝗯𝗼𝘁..."
    }
  },

  onLoad({ api }) {
    const tmpDir = `${__dirname}/tmp`;
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    const pathFile = `${tmpDir}/restart.txt`;
    if (fs.existsSync(pathFile)) {
      setTimeout(() => {
        try {
          const [tid, startTime] = fs.readFileSync(pathFile, "utf-8").split(" ");
          const restartTime = ((Date.now() - startTime) / 1000).toFixed(2);
          const now = new Date();
          const mem = process.memoryUsage();
          const usedMem = Math.round(mem.heapUsed / 1024 / 1024);
          const totalMem = Math.round(mem.heapTotal / 1024 / 1024);

          const msg = `✅ SAGOR BOT V2 RESTARTED
━━━━━━━━━━━━━━
⚡ Restart Time: ${restartTime}s
📅 Date: ${now.toLocaleDateString()}
⏰ Time: ${now.toLocaleTimeString()}
💾 Memory: ${usedMem}MB / ${totalMem}MB
🔧 Server: ${os.platform()} ${os.release()}
🎯 Status: Online & Ready`;

          api.sendMessage(msg, tid);
          fs.unlinkSync(pathFile);
        } catch (e) {
          console.error("Restart message error:", e);
        }
      }, 2000);
    }
  },

  onStart: async function ({ message, event, getLang, api }) {
    const admins = global.GoatBot?.config?.adminBot || [];
    if (!admins.includes(event.senderID)) {
      return api.sendMessage(
        "🚫 SAGOR BOT V2\n━━━━━━━━━━━━━━\n❌ Restricted to admins only!",
        event.threadID
      );
    }

    const tmpDir = `${__dirname}/tmp`;
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
    const pathFile = `${tmpDir}/restart.txt`;

    fs.writeFileSync(pathFile, `${event.threadID} ${Date.now()}`);

    await message.reply(getLang("restartting"));

    process.exit(2);
  }
};
