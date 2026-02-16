module.exports = {
  config: {
    name: "pending",
    version: "1.1",
    author: "𝗦𝗮𝗚𝗼𝗿",
    countDown: 5,
    role: 2,
    shortDescription: {
      vi: "Quản lý nhóm đang chờ phê duyệt",
      en: "Manage pending group approvals"
    },
    longDescription: {
      vi: "Lệnh quản trị để xem, chấp nhận hoặc từ chối các nhóm đang chờ tham gia bot\n\nCách sử dụng:\n• /pending - Hiển thị danh sách nhóm chờ\n• Trả lời với số - Chấp nhận nhóm\n• Trả lời với 'c' + số - Từ chối nhóm",
      en: "Admin command to view, approve or reject groups waiting to add the bot\n\nUsage:\n• /pending - Show pending groups list\n• Reply with numbers - Approve groups\n• Reply with 'c' + numbers - Cancel/reject groups"
    },
    category: "Admin",
    guide: {
      vi: {
        body: "{pn}: Xem danh sách nhóm đang chờ\n{pn} [số | c/số]: Phê duyệt/từ chối nhóm"
      },
      en: {
        body: "{pn}: View pending groups list\n{pn} [number | c/number]: Approve/reject groups"
      }
    }
  },

  langs: {
    en: {
      invaildNumber: "❌ %1 is not a valid number",
      cancelSuccess: "✅ Refused %1 thread(s)!",
      approveSuccess: "✅ Approved successfully %1 thread(s)!",
      cantGetPendingList: "❌ Can't get the pending list!",
      returnListPending: "📋 »「PENDING LIST」«\n┣✦ Total threads: %1\n┣✦ Reply with numbers to approve\n┣✦ Use 'c' before numbers to cancel\n┗✦ Example: 1 2 3 or c1 c2\n\n%2",
      returnListClean: "📭「PENDING」There are no pending groups at the moment",
      syntaxError: "⚠️ Syntax error! Please use:\n• Numbers to approve (1 2 3)\n• 'c' + numbers to cancel (c1 c2)",
      noPermission: "🚫 You don't have permission to use this command!"
    },
    vi: {
      invaildNumber: "❌ %1 không phải là số hợp lệ",
      cancelSuccess: "✅ Đã từ chối %1 nhóm!",
      approveSuccess: "✅ Đã phê duyệt thành công %1 nhóm!",
      cantGetPendingList: "❌ Không thể lấy danh sách chờ!",
      returnListPending: "📋 »「DANH SÁCH CHỜ」«\n┣✦ Tổng số nhóm: %1\n┣✦ Phản hồi bằng số để chấp nhận\n┣✦ Dùng 'c' trước số để từ chối\n┗✦ Ví dụ: 1 2 3 hoặc c1 c2\n\n%2",
      returnListClean: "📭「DANH SÁCH CHỜ」Hiện không có nhóm nào đang chờ",
      syntaxError: "⚠️ Lỗi cú pháp! Vui lòng dùng:\n• Số để chấp nhận (1 2 3)\n• 'c' + số để từ chối (c1 c2)",
      noPermission: "🚫 Bạn không có quyền sử dụng lệnh này!"
    }
  },

  onReply: async function ({ api, event, Reply, getLang, commandName, args }) {
    if (String(event.senderID) !== String(Reply.author)) return;
    const { body, threadID, messageID } = event;
    let count = 0;

    if (body.toLowerCase() === "help" || body === "?") {
      return api.sendMessage(getLang("syntaxError"), threadID, messageID);
    }

    if ((isNaN(body) && body.toLowerCase().indexOf("c") == 0) || body.toLowerCase().indexOf("cancel") == 0) {
      const index = (body.toLowerCase().slice(1)).split(/\s+/);
      for (const i of index) {
        if (isNaN(i) || i <= 0 || i > Reply.pending.length)
          return api.sendMessage(getLang("invaildNumber", i), threadID, messageID);
        try {
          api.removeUserFromGroup(api.getCurrentUserID(), Reply.pending[i - 1].threadID);
          count++;
        } catch (e) {
          console.error("Error removing from group:", e);
        }
      }
      return api.sendMessage(getLang("cancelSuccess", count), threadID, messageID);
    } else {
      const index = body.split(/\s+/);
      for (const i of index) {
        if (isNaN(i) || i <= 0 || i > Reply.pending.length)
          return api.sendMessage(getLang("invaildNumber", i), threadID, messageID);

        const targetThread = Reply.pending[i - 1].threadID;
        try {
          const threadInfo = await api.getThreadInfo(targetThread);
          const groupName = threadInfo.threadName || "Unnamed Group";
          const memberCount = threadInfo.participantIDs.length;
          const time = new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' });
          
          api.sendMessage(
`╔═══════✦❖༺❖✦═══════╗
┃
┃➥🗃️ 𝙂𝙍𝙊𝙐𝙋 𝙉𝘼𝙈𝙀: ${groupName}
┃➥🆔 𝙄𝘿: ${targetThread}
┃➥👾 𝙈𝙀𝙈𝘽𝙀𝙍𝙎: ${memberCount}
┃➥⚡ 𝘼𝙋𝙋𝙍𝙊𝙑𝘼𝙇 𝙈𝙊𝘿𝙀: ${threadInfo.approvalMode ? "🟢 𝙊𝙉" : "🔴 𝙊𝙁𝙁"}
┃➥🎭 𝙀𝙈𝙊𝙅𝙄: ${threadInfo.emoji || "⚫ 𝙉𝙊𝙉𝙀"}
┃➥⏰ 𝙅𝙊𝙄𝙉𝙀𝘿: ${time}
┃➥🤖 𝘽𝙊𝙏 𝙊𝙒𝙉𝙀𝙍: 『𝗦𝗔𝗚𝗢𝗥』
┃➥🌐 𝙁𝘼𝘾𝙀𝘽𝙊𝙊𝙆: 𝗳𝗯.𝗰𝗼𝗺/𝗦𝗔𝗚𝗢𝗥.𝟲𝟵𝘅
┃➥🗺️ 𝘾𝙊𝙐𝙉𝙏𝙍𝙔: 𝘽𝙖𝙣𝙜𝙡𝙖𝙙𝙚𝙨𝙝
┃➥📡 𝙒𝙃𝘼𝙏𝙎𝘼𝙋𝙋: 𝟬𝟭𝟲𝟭𝟭𝟬𝟳𝟵𝟵**
┃➥📧 𝙀𝙈𝘼𝙄𝙇: 𝗯𝗮𝗯𝘆𝗴𝗶𝘁𝗵𝘂𝗯@𝙜𝙢𝙖𝙞𝙡.𝙘𝙤𝙢
┃
╚═══════✦❖༺❖✦═══════╝

💡 𝙏𝙮𝙥𝙚 /𝙝𝙚𝙡𝙥 𝙩𝙤 𝙨𝙚𝙚 𝙖𝙡𝙡 𝙘𝙤𝙢𝙢𝙖𝙣𝙙𝙨
✅ 𝘽𝙤𝙩 𝙞𝙨 𝙣𝙤𝙬 𝙖𝙘𝙩𝙞𝙫𝙚 𝙞𝙣 𝙩𝙝𝙞𝙨 𝙜𝙧𝙤𝙪𝙥!`, targetThread);

          count++;
        } catch (error) {
          console.error("Error approving group:", error);
        }
      }
      return api.sendMessage(getLang("approveSuccess", count), threadID, messageID);
    }
  },

  onStart: async function ({ api, event, getLang, commandName, args }) {
    const { threadID, messageID, senderID } = event;
    
    const adminIDs = [];
    if (event.senderID !== api.getCurrentUserID() && !adminIDs.includes(senderID)) {
      try {
        const threadInfo = await api.getThreadInfo(threadID);
        const isAdmin = threadInfo.adminIDs.some(admin => admin.id === senderID);
        if (!isAdmin) {
          return api.sendMessage(getLang("noPermission"), threadID, messageID);
        }
      } catch (e) {
        console.error("Error checking admin:", e);
      }
    }

    let msg = "", index = 1;

    try {
      const spam = await api.getThreadList(100, null, ["OTHER"]) || [];
      const pending = await api.getThreadList(100, null, ["PENDING"]) || [];
      const list = [...spam, ...pending].filter(group => group.isSubscribed && group.isGroup);

      if (list.length === 0) {
        return api.sendMessage(getLang("returnListClean"), threadID, messageID);
      }

      for (const item of list) {
        const groupName = item.name || "Unnamed Group";
        msg += `┣ ${index++}. ${groupName}\n   ┗ ID: ${item.threadID}\n`;
      }

      const responseMsg = getLang("returnListPending", list.length, msg);
      return api.sendMessage(responseMsg, threadID, (err, info) => {
        if (err) return console.error(err);
        global.GoatBot.onReply.set(info.messageID, {
          commandName,
          messageID: info.messageID,
          author: event.senderID,
          pending: list
        });
      }, messageID);

    } catch (e) {
      console.error("Error in pending command:", e);
      return api.sendMessage(getLang("cantGetPendingList"), threadID, messageID);
    }
  }
};
