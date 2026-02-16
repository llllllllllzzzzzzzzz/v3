const fs = require("fs-extra");
const nullAndUndefined = [undefined, null];
const leven = require('leven');

function getType(obj) {
    return Object.prototype.toString.call(obj).slice(8, -1);
}

function getRole(threadData, senderID) {
    const config = global.GoatBot.config;
    const adminBot = config.adminBot || [];
    const developer = config.developer || [];
    const vipuser = config.vipuser || []; 
    
    if (!senderID) return 0;
    const adminBox = threadData ? threadData.adminIDs || [] : [];
    
    if (developer.includes(senderID)) return 4;
    if (adminBot.includes(senderID)) return 3; 
    if (vipuser.includes(senderID)) return 2; 
    if (adminBox.includes(senderID)) return 1;
    return 0;
}

function getText(type, reason, time, targetID, lang) {
    const utils = global.utils;
    if (type == "userBanned") return utils.getText({ lang, head: "handlerOnStart" }, "userBanned", reason, time, targetID);
    else if (type == "threadBanned") return utils.getText({ lang, head: "handlerOnStart" }, "threadBanned", reason, time, targetID);
    else if (type == "onlyAdminBox") return utils.getText({ lang, head: "handlerOnStart" }, "onlyAdminBox");
    else if (type == "onlyAdminBot") return utils.getText({ lang, head: "handlerOnStart" }, "onlyAdminBot");
}

function replaceShortcutInLang(text, prefix, commandName) {
    return text.replace(/\{(?:p|prefix)\}/g, prefix).replace(/\{(?:n|name)\}/g, commandName).replace(/\{pn\}/g, `\( {prefix} \){commandName}`);
}

function getRoleConfig(utils, command, isGroup, threadData, commandName) {
    let roleConfig;
    if (utils.isNumber(command.config.role)) {
        roleConfig = { onStart: command.config.role };
    } else if (typeof command.config.role == "object" && !Array.isArray(command.config.role)) {
        if (!command.config.role.onStart) command.config.role.onStart = 0;
        roleConfig = command.config.role;
    } else {
        roleConfig = { onStart: 0 };
    }

    if (isGroup) roleConfig.onStart = threadData.data.setRole?.[commandName] ?? roleConfig.onStart;

    for (const key of ["onChat", "onStart", "onReaction", "onReply"]) {
        if (roleConfig[key] == undefined) roleConfig[key] = roleConfig.onStart;
    }

    return roleConfig;
}

function isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, lang) {
    const config = global.GoatBot.config;
    const { adminBot, developer, vipuser, hideNotiMessage, developerOnly, vipOnly } = config; 
    const allHighRoles = [...adminBot, ...developer, ...vipuser]; 
    const role = getRole(threadData, senderID); 

    const infoBannedUser = userData.banned;
    if (infoBannedUser.status == true) {
        const { reason, date } = infoBannedUser;
        if (hideNotiMessage.userBanned == false) message.reply(getText("userBanned", reason, date, senderID, lang));
        return true;
    }

    if (config.adminOnly.enable == true && !adminBot.includes(senderID) && !config.developer.includes(senderID) && !config.vipuser.includes(senderID) && !config.adminOnly.ignoreCommand.includes(commandName)) {
        if (hideNotiMessage.adminOnly == false) message.reply(global.utils.getText({ lang, head: "handlerOnStart" }, "onlyAdminBot", null, null, null, lang));
        return true;
    }
    
    if ((developerOnly?.enable == true) && role < 2 && !(developerOnly?.ignoreCommand || []).includes(commandName)) {
        if ((hideNotiMessage.developerOnly ?? false) == false) message.reply(global.utils.getText({ lang, head: "handlerOnStart" }, "onlyVipUserGlobal", null, null, null, lang)); 
        return true;
    }
    
    if ((vipOnly?.enable == true) && role < 2 && !(vipOnly?.ignoreCommand || []).includes(commandName)) {
        if ((hideNotiMessage.vipOnly ?? false) == false) message.reply(global.utils.getText({ lang, head: "handlerOnStart" }, "onlyVipUserGlobal", null, null, null, lang));
        return true;
    }

    if (isGroup == true) {
        if (threadData.data.onlyAdminBox === true && !threadData.adminIDs.includes(senderID) && !(threadData.data.ignoreCommanToOnlyAdminBox || []).includes(commandName)) {
            if (!threadData.data.hideNotiMessageOnlyAdminBox) message.reply(getText("onlyAdminBox", null, null, null, lang));
            return true;
        }

        const infoBannedThread = threadData.banned;
        if (infoBannedThread.status == true) {
            const { reason, date } = infoBannedThread;
            if (hideNotiMessage.threadBanned == false) message.reply(getText("threadBanned", reason, date, threadID, lang));
            return true;
        }
    }
    return false;
}

function createGetText2(langCode, pathCustomLang, prefix, command) {
    const commandType = command.config.countDown ? "command" : "command event";
    const commandName = command.config.name;
    let customLang = {};
    let getText2 = () => { };
    if (fs.existsSync(pathCustomLang)) customLang = require(pathCustomLang)[commandName]?.text || {};
    if (command.langs || customLang || {}) {
        getText2 = function (key, ...args) {
            let lang = command.langs?.[langCode]?.[key] || customLang[key] || "";
            lang = replaceShortcutInLang(lang, prefix, commandName);
            for (let i = args.length - 1; i >= 0; i--) lang = lang.replace(new RegExp(`%${i + 1}`, "g"), args[i]);
            return lang || `❌ Can't find text on language "\( {langCode}" for \( {commandType} " \){commandName}" with key " \){key}"`;
        };
    }
    return getText2;
}

module.exports = function (api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData) {
    return async function (event, message) {
        const { utils, client, GoatBot } = global;
        const { getPrefix, removeHomeDir, log, getTime } = utils;
        const { config, configCommands: { envGlobal, envCommands, envEvents } } = GoatBot;
        const { autoRefreshThreadInfoFirstTime } = config.database;
        let { hideNotiMessage = {} } = config;

        const { body, messageID, threadID, isGroup } = event;

        if (!threadID) return;

        const senderID = event.userID || event.senderID || event.author;

        let threadData = global.db.allThreadData.find(t => t.threadID == threadID);
        let userData = global.db.allUserData.find(u => u.userID == senderID);

        if (!userData && !isNaN(senderID)) userData = await usersData.create(senderID);

        if (!threadData && !isNaN(threadID)) {
            if (global.temp.createThreadDataError.includes(threadID)) return;
            threadData = await threadsData.create(threadID);
            global.db.receivedTheFirstMessage[threadID] = true;
        } else {
            if (autoRefreshThreadInfoFirstTime === true && !global.db.receivedTheFirstMessage[threadID]) {
                global.db.receivedTheFirstMessage[threadID] = true;
                await threadsData.refreshInfo(threadID);
            }
        }

        if (typeof threadData.settings.hideNotiMessage == "object") hideNotiMessage = threadData.settings.hideNotiMessage;

        const prefix = getPrefix(threadID);
        const role = getRole(threadData, senderID);
        const parameters = {
            api, usersData, threadsData, message, event,
            userModel, threadModel, prefix, dashBoardModel,
            globalModel, dashBoardData, globalData, envCommands,
            envEvents, envGlobal, role,
            removeCommandNameFromBody: function removeCommandNameFromBody(body_, prefix_, commandName_) {
                if ([body_, prefix_, commandName_].every(x => nullAndUndefined.includes(x))) throw new Error("Please provide body, prefix and commandName to use this function, this function without parameters only support for onStart");
                for (let i = 0; i < arguments.length; i++) if (typeof arguments[i] != "string") throw new Error(`The parameter "\( {i + 1}" must be a string, but got " \){getType(arguments[i])}"`);
                return body_.replace(new RegExp(`^\( {prefix_}(\\s+|) \){commandName_}`, "i"), "").trim();
            }
        };
        const langCode = threadData.data.lang || config.language || "en";

        function createMessageSyntaxError(commandName) {
            message.SyntaxError = async function () {
                return await message.reply(utils.getText({ lang: langCode, head: "handlerOnStart" }, "commandSyntaxError", prefix, commandName));
            };
        }

        // <<< --- onStart LOGIC --- >>>
        // Admin no-prefix users
        const adminNoPrefixUsers = config.adminBot || [];

        let command, commandName, args = [];
        const dateNow = Date.now();

        if (!body) return;

        if (!body.startsWith(prefix)) {
            if (adminNoPrefixUsers.includes(senderID)) {
                const allCommands = Array.from(GoatBot.commands.keys());

                // First, check primary commands
                let matchCommand = null;
                let remainingBody = "";

                for (const cmd of allCommands) {
                    const lowerCmd = cmd.toLowerCase();
                    if (body.toLowerCase() === lowerCmd || body.toLowerCase().startsWith(lowerCmd + " ")) {
                        matchCommand = cmd;
                        remainingBody = body.slice(cmd.length).trim();
                        break;
                    }
                }

                // If no primary match, check global aliases
                if (!matchCommand) {
                    for (const [alias, realCmd] of GoatBot.aliases.entries()) {
                        const lowerAlias = alias.toLowerCase();
                        if (body.toLowerCase() === lowerAlias || body.toLowerCase().startsWith(lowerAlias + " ")) {
                            matchCommand = realCmd;  // Assuming GoatBot.aliases maps alias -> primary name
                            remainingBody = body.slice(alias.length).trim();
                            break;
                        }
                    }
                }

                // Then, check thread-specific aliases
                if (!matchCommand) {
                    const aliasesData = threadData.data.aliases || {};
                    for (const cmdKey in aliasesData) {
                        for (const alias of aliasesData[cmdKey]) {
                            const lowerAlias = alias.toLowerCase();
                            if (body.toLowerCase() === lowerAlias || body.toLowerCase().startsWith(lowerAlias + " ")) {
                                matchCommand = cmdKey;
                                remainingBody = body.slice(alias.length).trim();
                                break;
                            }
                        }
                        if (matchCommand) break;
                    }
                }

                if (matchCommand) {
                    commandName = matchCommand;
                    command = GoatBot.commands.get(commandName);
                    args = remainingBody ? remainingBody.split(/ +/) : [];
                } else return; // Not a known command, ignore
            } else return; // normal user without prefix -> ignore
        } else {
            // === PREFIX FLOW ===
            args = body.slice(prefix.length).trim().split(/ +/);
         let cmdName = args.shift().toLowerCase();
         commandName = cmdName; 
         command = GoatBot.commands.get(cmdName) || GoatBot.commands.get(GoatBot.aliases.get(cmdName));

            const aliasesData = threadData.data.aliases || {};
            for (const cmdKey in aliasesData) {
                if (aliasesData[cmdKey].includes(cmdName)) {
                    command = GoatBot.commands.get(cmdKey);
                    cmdName = cmdKey;
                    break;
                }
            }
            if (command) commandName = command.config.name;
        }
        if (command) commandName = command.config.name;
        function removeCommandNameFromBody(body_, prefix_, commandName_) {
            if (arguments.length) {
                if (typeof body_ != "string") throw new Error(`The first argument (body) must be a string, but got "${getType(body_)}"`);
                if (typeof prefix_ != "string") throw new Error(`The second argument (prefix) must be a string, but got "${getType(prefix_)}"`);
                if (typeof commandName_ != "string") throw new Error(`The third argument (commandName) must be a string, but got "${getType(commandName_)}"`);
                return body_.replace(new RegExp(`^\( {prefix_}(\\s+|) \){commandName_}`, "i"), "").trim();
            } else {
                return body.replace(new RegExp(`^\( {prefix}(\\s+|) \){commandName}`, "i"), "").trim();
            }
        }
        if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode)) return;
        if (!command) {
            if (!hideNotiMessage.commandNotFound) {
                const allCommands = Array.from(GoatBot.commands.keys());
                let closestCommand = null;
                let minDistance = 999;
                const distanceThreshold = 2;
                if (commandName) {
                    for (const correctCommand of allCommands) {
                        const distance = leven(commandName.toLowerCase(), correctCommand.toLowerCase());
                        if (distance < minDistance && distance <= distanceThreshold) {
                            minDistance = distance;
                            closestCommand = correctCommand;
                        }
                    }
                }
                if (closestCommand) {
                    return await message.reply(utils.getText({ lang: langCode, head: "handlerOnStart" }, "commandNotFoundSuggestion", closestCommand, prefix));
                } else {
                    return await message.reply(commandName ? utils.getText({ lang: langCode, head: "handlerOnStart" }, "commandNotFound", commandName, prefix) : utils.getText({ lang: langCode, head: "handlerOnStart" }, "commandNotFound2", prefix));
                }
            } else return true;
        }
        const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
        const needRole = roleConfig.onStart;
        if (needRole > role) {
            if (!hideNotiMessage.needRoleToUseCmd) {
                if (needRole == 1) return await message.reply(utils.getText({ lang: langCode, head: "handlerOnStart" }, "onlyAdmin", commandName));
                else if (needRole == 2) return await message.reply(utils.getText({ lang: langCode, head: "handlerOnStart" }, "onlyAdminBot2", commandName));
                else if (needRole == 3) return await message.reply(utils.getText({ lang: langCode, head: "handlerOnStart" }, "onlyVipUser", commandName));
                else if (needRole == 4) return await message.reply(utils.getText({ lang: langCode, head: "handlerOnStart" }, "onlyDeveloper", commandName));
            } else return true;
        }
        if (!client.countDown[commandName]) client.countDown[commandName] = {};
        const timestamps = client.countDown[commandName];
        let getCoolDown = command.config.countDown;
        if (!getCoolDown && getCoolDown != 0 || isNaN(getCoolDown)) getCoolDown = 1;
        const cooldownCommand = getCoolDown * 1000;
        if (timestamps[senderID]) {
            const expirationTime = timestamps[senderID] + cooldownCommand;
            if (dateNow < expirationTime) return await message.reply(utils.getText({ lang: langCode, head: "handlerOnStart" }, "waitingForCommand", ((expirationTime - dateNow) / 1000).toString().slice(0, 3)));
        }
        const time = getTime("DD/MM/YYYY HH:mm:ss");
        isUserCallCommand = true;
        try {
            (async () => {
                const analytics = await globalData.get("analytics", "data", {});
                if (!analytics[commandName]) analytics[commandName] = 0;
                analytics[commandName]++;
                await globalData.set("analytics", analytics, "data");
            })();
            createMessageSyntaxError(commandName);
            const getText2 = createGetText2(langCode, `\( {process.cwd()}/languages/cmds/ \){langCode}.js`, prefix, command);
            await command.onStart({ ...parameters, args, commandName, getLang: getText2, removeCommandNameFromBody });
            timestamps[senderID] = dateNow;
            log.info("CALL COMMAND", `${commandName} | ${userData.name} | ${senderID} | ${threadID} | ${args.join(" ")}`);
        } catch (err) {
            log.err("CALL COMMAND", `An error occurred when calling the command ${commandName}`, err);
            return await message.reply(utils.getText({ lang: langCode, head: "handlerOnStart" }, "errorOccurred", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
        }
    };
};
