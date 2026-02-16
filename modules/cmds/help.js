/**
 * ================================
 *  Author  : SAGOR
 *  Note    : Coded with ➲ by SAGOR
 * ================================
 */

const { getPrefix } = global.utils;
const { commands } = global.GoatBot;

module.exports = {
  config: {
    name: "help",
    version: "3.5",
    author: "SaGor",
    usePrefix: false,
    role: 0,
    category: "info",
    priority: 1
  },

  onStart: async function ({ message, args, event, role }) {
    const prefix = getPrefix(event.threadID);
    const arg = args[0]?.toLowerCase();

    if (!arg) {
      const listByCategory = {};
      Array.from(commands.entries())
        .filter(([_, cmd]) => cmd.config.role <= role)
        .forEach(([name, cmd]) => {
          const cat = cmd.config.category || "Uncategorized";
          if (!listByCategory[cat]) listByCategory[cat] = [];
          listByCategory[cat].push(name);
        });

      let msg = "";
      for (let cat in listByCategory) {
        msg += `\n${cat.toUpperCase()}\n`;
        listByCategory[cat].forEach(cmd => msg += `• ${cmd}\n`);
      }
      return message.reply(msg.trim());
    }

    const cmd = commands.get(arg) || commands.get(global.GoatBot.aliases.get(arg));
    if (!cmd || cmd.config.role > role) return message.reply(`✘ Command "${arg}" not found.`);

    const info = cmd.config;
    let msg = `╭─❖🌟 ${info.name.toUpperCase()} 🌟❖─╮\n\n`;
    msg += `👑 𝗔𝘂𝘁𝗵𝗼𝗿   : ${info.author}\n`;
    msg += `⚙️ 𝗩𝗲𝗿𝘀𝗶𝗼𝗻  : ${info.version}\n`;
    msg += `📂 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆 : ${info.category}\n`;
    msg += `🕒 𝗖𝗼𝗼𝗹𝗱𝗼𝘄𝗻: ${info.countDown || info.cooldowns || 3}s\n`;
    msg += `🎯 𝗥𝗼𝗹𝗲     : ${info.role}\n`;
    msg += `💬 𝗗𝗲𝘀𝗰    : ${info.shortDescription || info.description || "No description"}\n`;
    msg += `💡 𝗨𝘀𝗮𝗴𝗲   : ${prefix}${info.guide?.en || info.usages || info.name}\n`;
    msg += info.aliases?.length ? `🔁 Aliases : ${info.aliases.join(", ")}\n` : "";
    msg += `\n╰────────• 🌸 •──────────╯`;
    return message.reply(msg);
  }
};
