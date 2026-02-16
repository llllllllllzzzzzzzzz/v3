const { getTime, drive } = global.utils;

if (!global.temp.welcomeEvent) global.temp.welcomeEvent = {};

module.exports = {
    config: {
        name: "welcome",
        version: "1.7",
        author: "NTKhang",
        category: "events"
    },

    langs: {
        en: {
            session1: "morning",
            session2: "noon",
            session3: "afternoon",
            session4: "evening",
            welcomeMessage:
                "Thank you for inviting me to the group!\nBot prefix: %1\nTo view the list of commands, please enter: %1help",
            multiple1: "you",
            multiple2: "you guys",
            defaultWelcomeMessage:
                "Hello {userName}.\nWelcome {multiple} to the chat group: {boxName}\nHave a nice {session} 😊"
        }
    },

    onStart: async ({ threadsData, message, event, api, getLang }) => {
        // Only handle subscribe events (new members)
        if (event.logMessageType !== "log:subscribe") return;

        const hours = getTime("HH");
        const { threadID } = event;
        const { nickNameBot } = global.GoatBot.config; // GoatBot style
        const prefix = global.utils.getPrefix(threadID);
        const dataAddedParticipants = event.logMessageData.addedParticipants;

        // If bot is added
        if (dataAddedParticipants.some((item) => item.userFbId == api.getCurrentUserID())) {
            if (nickNameBot) api.changeNickname(nickNameBot, threadID, api.getCurrentUserID());
            return message.send(getLang("welcomeMessage", prefix));
        }

        // Initialize temporary storage
        if (!global.temp.welcomeEvent[threadID])
            global.temp.welcomeEvent[threadID] = { joinTimeout: null, dataAddedParticipants: [] };

        // Push new members
        global.temp.welcomeEvent[threadID].dataAddedParticipants.push(...dataAddedParticipants);

        // Clear old timeout
        clearTimeout(global.temp.welcomeEvent[threadID].joinTimeout);

        // Set new timeout to send welcome
        global.temp.welcomeEvent[threadID].joinTimeout = setTimeout(async () => {
            const threadData = await threadsData.get(threadID);

            if (threadData.settings.sendWelcomeMessage === false) return;

            const dataAdded = global.temp.welcomeEvent[threadID].dataAddedParticipants;
            const dataBanned = threadData.data.banned_ban || [];
            const threadName = threadData.threadName;
            const userName = [];
            const mentions = [];
            let multiple = dataAdded.length > 1;

            for (const user of dataAdded) {
                if (dataBanned.some((item) => item.id == user.userFbId)) continue;
                userName.push(user.fullName);
                mentions.push({ tag: user.fullName, id: user.userFbId });
            }

            if (userName.length === 0) return;

            let { welcomeMessage = getLang("defaultWelcomeMessage") } = threadData.data;

            const form = { mentions: welcomeMessage.includes("{userNameTag}") ? mentions : null };

            // Replace placeholders
            form.body = welcomeMessage
                .replace(/\{userName\}|\{userNameTag\}/g, userName.join(", "))
                .replace(/\{boxName\}|\{threadName\}/g, threadName)
                .replace(/\{multiple\}/g, multiple ? getLang("multiple2") : getLang("multiple1"))
                .replace(
                    /\{session\}/g,
                    hours <= 10
                        ? getLang("session1")
                        : hours <= 12
                        ? getLang("session2")
                        : hours <= 18
                        ? getLang("session3")
                        : getLang("session4")
                );

            // Attachments if any
            if (threadData.data.welcomeAttachment) {
                const attachments = await Promise.all(
                    threadData.data.welcomeAttachment.map((file) => drive.getFile(file, "stream"))
                );
                form.attachment = attachments.filter(Boolean);
            }

            message.send(form);

            // Clear temp data
            delete global.temp.welcomeEvent[threadID];
        }, 1500);
    }
};
