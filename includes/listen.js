/**
 *  GOATBOT V3
 *  CONTACT : rxabdullah617@gmail.com
 *  NOTES : THIS CODE MADE BY RX @RX_ABDULLAH007
 *  (GIVE CREDIT OTHERWISE EVERYONE FUCK YOU AT 300 KM SPEED)
 **/

const createFuncMessage = global.utils.message;
const handlerCheckDB = require("./handler/CheckData.js");

const getOnStartHandler = require(
	process.env.NODE_ENV === "development"
		? "./handler/onStart.dev.js"
		: "./handler/onStart.js"
);
const getOnReactionHandler = require(
	process.env.NODE_ENV === "development"
		? "./handler/onReaction.dev.js"
		: "./handler/onReaction.js"
);
const getOnReplyHandler = require(
	process.env.NODE_ENV === "development"
		? "./handler/onReply.dev.js"
		: "./handler/onReply.js"
);
const getOnEventHandler = require(
	process.env.NODE_ENV === "development"
		? "./handler/onEvent.dev.js"
		: "./handler/onEvent.js"
);

module.exports = (
	api,
	threadModel,
	userModel,
	dashBoardModel,
	globalModel,
	usersData,
	threadsData,
	dashBoardData,
	globalData
) => {
	const onStart = getOnStartHandler(
		api,
		threadModel,
		userModel,
		dashBoardModel,
		globalModel,
		usersData,
		threadsData,
		dashBoardData,
		globalData
	);
	const onReaction = getOnReactionHandler(
		api,
		threadModel,
		userModel,
		dashBoardModel,
		globalModel,
		usersData,
		threadsData,
		dashBoardData,
		globalData
	);
	const onReply = getOnReplyHandler(
		api,
		threadModel,
		userModel,
		dashBoardModel,
		globalModel,
		usersData,
		threadsData,
		dashBoardData,
		globalData
	);
	const onEvent = getOnEventHandler(
		api,
		threadModel,
		userModel,
		dashBoardModel,
		globalModel,
		usersData,
		threadsData,
		dashBoardData,
		globalData
	);

	return async function listener(event) {
		// Anti Inbox
		if (global.GoatBot.config?.antiInbox && !event.isGroup) return;

		const message = createFuncMessage(api, event);

		await handlerCheckDB(usersData, threadsData, event);

		const onStartObj = await onStart(event, message);
		const onReactionObj = await onReaction(event, message);
		const onReplyObj = await onReply(event, message);
		const onEventObj = await onEvent(event, message);

		const onStartFunc = onStartObj?.onStart;
		const onReactionFunc = onReactionObj?.onReaction;
		const onReplyFunc = onReplyObj?.onReply;

		const {
			onAnyEvent,
			onFirstChat,
			onChat,
			onEvent: onEventFunc,
			handlerEvent,
			typ,
			presence,
			read_receipt
		} = onEventObj || {};

		// Approval system
		if (global.GoatBot.config?.approval) {
			const approvedtid = await globalData.get("approved", "data", {});
			if (!Array.isArray(approvedtid.approved)) {
				approvedtid.approved = [];
				await globalData.set("approved", approvedtid, "data");
			}
			if (!approvedtid.approved.includes(event.threadID)) return;
		}

		onAnyEvent && onAnyEvent();

		switch (event.type) {
			case "message":
			case "message_reply":
			case "message_unsend":
				onFirstChat && onFirstChat();
				onChat && onChat();
				onStartFunc && onStartFunc();
				onReplyFunc && onReplyFunc();
				break;

			case "event":
				handlerEvent && handlerEvent();
				onEventFunc && onEventFunc();
				break;

			case "message_reaction": {
				onReactionFunc && onReactionFunc();

				const botID = api.getCurrentUserID();
				const senderID = event.messageSenderID || event.senderID;
				const deleteEmojis = global.GoatBot.config?.reactBy?.delete || [];

				// ✅ ONLY: React → Unsend BOT message
				if (deleteEmojis.includes(event.reaction) && senderID === botID) {
					console.log(
						"🗑️ Unsend bot message triggered:",
						event.messageID
					);
					api.unsendMessage(event.messageID);
				}
				break;
			}

			case "typ":
				typ && typ();
				break;

			case "presence":
				presence && presence();
				break;

			case "read_receipt":
				read_receipt && read_receipt();
				break;

			default:
				break;
		}
	};
};
