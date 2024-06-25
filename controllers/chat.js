import {
  ALERT,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  REFETCH_CHATS,
} from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";
import { tyrCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import { deleteFilesFromCloudinary, emitEvent, uploadFilesToCloudinary } from "../utils/features.js";
import { ErrorHandler } from "../utils/utility.js";

const newGroupChat = tyrCatch(async (req, res, next) => {
  const { members, name } = req.body;

  if (members.length < 2)
    return next(
      new ErrorHandler("Group chat must have atleast 3 members", 400)
    );

  const allMembers = [...members, req.user];

  await Chat.create({
    name,
    groupChat: true,
    creator: req.user,
    members: allMembers,
  });

  //socket
  emitEvent(req, ALERT, allMembers, `Welcome to ${name}`); // including me
  emitEvent(req, REFETCH_CHATS, members, `Welcome to ${name}`); // excluding me

  return res.status(201).json({
    success: true,
    message: "Group chat created",
  });
});

const getMyChats = tyrCatch(async (req, res, next) => {
  const chats = await Chat.find({ members: req.user }).populate(
    "members",
    "name avatar"
  );

  const transformChat = chats.map(({ _id, name, members, groupChat }) => {
    const otherMember = getOtherMember(members, req.user);
    return {
      _id,
      groupChat,
      avatar: groupChat
        ? members.slice(0, 3).map(({ avatar }) => avatar.url)
        : [otherMember.avatar.url],
      name: groupChat ? name : otherMember.name,
      members: members.reduce((prev, cur) => {
        if (cur._id.toString() !== req.user.toString()) {
          prev.push(cur._id);
        }
        return prev;
      }, []),
    };
  });
  return res.status(200).json({
    success: true,
    chat: transformChat,
  });
});

const getMyGroups = tyrCatch(async (req, res, next) => {
  const chats = await Chat.find({
    members: req.user,
    groupChat: true,
    creator: req.user,
  }).populate("members", "name avatar");

  const groups = chats.map(({ members, _id, groupChat, name }) => ({
    groupChat,
    name,
    _id,
    avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
  }));

  return res.status(200).json({
    success: true,
    groups,
  });
});

const addMembers = tyrCatch(async (req, res, next) => {
  const { chatId, members } = req.body;
  if (!members || members.length < 1)
    return next(new ErrorHandler("Please provide members", 400));

  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("chat not found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("Goup chat not found", 400));
  if (chat.creator.toString() !== req.user.toString())
    return next(new ErrorHandler("You are not allowed to add members", 403));

  const allNewMembersPromise = members.map((i) => User.findById(i, "name"));

  const allNewMembers = await Promise.all(allNewMembersPromise);

  const uniqueMembers = allNewMembers
    .filter((i) => !chat.members.includes(i._id.toString()))
    .map((i) => i._id);

  chat.members.push(...uniqueMembers);

  await chat.save();

  const allUserName = allNewMembers.map((i) => i.name).join(",");

  emitEvent(
    req,
    ALERT,
    chat.members,
    `${allUserName} have been added to ${chat.name}`
  );
  emitEvent(req, REFETCH_CHATS, chat.members);

  return res.status(200).json({
    success: true,
    message: "members added successfully",
  });
});

const removeMember = tyrCatch(async (req, res, next) => {
  const { userId, chatId } = req.body;
  const [chat, userThatWillBeRemoved] = await Promise.all([
    Chat.findById(chatId),
    User.findById(userId, "name"),
  ]);
  if (!chat) return next(new ErrorHandler("chat not found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("Goup chat not found", 400));
  if (chat.creator.toString() !== req.user.toString())
    return next(new ErrorHandler("You are not allowed to remove members", 403));
  if (chat.members.length <= 3)
    return next(new ErrorHandler("must contains 3 members atleast", 400));

  const allChatMembers = chat.members.map((i)=>i.toString())
  chat.members = chat.members.filter((i) => i.toString() !== userId.toString());

  await chat.save();

  emitEvent(
    req,
    ALERT,
    chat.members,
    {message:`${userThatWillBeRemoved.name} has been removed`,chatID}
  );
  emitEvent(req, REFETCH_CHATS, allChatMembers);

  return res.status(200).json({
    success: true,
    message: "member removed successfully",
  });
});

const leaveGroup = tyrCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("chat not found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("Goup chat not found", 400));

  const remainingMembers = chat.members.filter(
    (i) => i.toString() !== req.user.toString()
  );
  if (remainingMembers.length < 3)
    return next(
      new ErrorHandler("Group chat must have atleast 3 members", 400)
    );
  chat.members = remainingMembers;

  if (chat.creator.toString() === req.user.toString()) {
    chat.creator = chat.members[0];
  }

  const user = await User.findById(req.user, "name");
  await chat.save();

  emitEvent(req, ALERT, chat.members, {chatId,message:`${user.name} has left`});

  return res.status(200).json({
    success: true,
    message: "Left successfully",
  });
});

const sendAttachment = tyrCatch(async (req, res, next) => {
  const { chatId } = req.body; // Correctly extract chatId as a string

  const files = req.files || [];
  if (files.length < 1) return next(new ErrorHandler("Please upload attachments", 400));
  if (files.length >5) return next(new ErrorHandler("Files cannot exceeds limit 5", 400));


  const [chat, me] = await Promise.all([
    Chat.findById(chatId),
    User.findById(req.user, "name"),
  ]);

  if (!chat) return next(new ErrorHandler("chat not found", 404));


  // upload files
  const attachment = await uploadFilesToCloudinary(files);

  const messageforRealtime = {
    content: "",
    attachment,
    sender: { _id: me._id, name: me.name },
    chat: chatId,
  };

  const messageforDb = {
    content: "",
    attachment,
    sender: me._id,
    chat: chatId,
  };

  const message = await Message.create(messageforDb);
  emitEvent(req, NEW_MESSAGE, chat.members, {
    message: messageforRealtime,
    chatId,
  });
  emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

  return res.status(200).json({
    success: true,
    message,
  });
});

const getChatDetails = tyrCatch(async (req, res, next) => {
  if (req.query.populate === "true") {
    const chat = await Chat.findById(req.params.id)
      .populate("members", "name avatar")
      .lean();
    if (!chat) return next(new ErrorHandler("chat not found", 404));
    chat.members = chat.members.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar.url,
    }));
    return res.status(200).json({
      success: true,
      chat,
    });
  } else {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return next(new ErrorHandler("chat not found", 404));
    return res.status(200).json({
      success: true,
      chat,
    });
  }
});

const renameGroup = tyrCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { name } = req.body;
  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("chat not found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("Goup chat not found", 400));
  if (chat.creator.toString() !== req.user.toString())
    return next(new ErrorHandler("You are not allowed to rename", 403));

  chat.name = name;
  await chat.save();
  emitEvent(req, REFETCH_CHATS, chat.members);

  return res.status(200).json({
    success: true,
    message: "Name changed successfully",
  });
});

const deleteChat = tyrCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  const members = chat.members;
  
  if (chat.groupChat && chat.creator.toString() !== req.user.toString()) {
    return next(new ErrorHandler("You are not allowed to delete the group", 403));
  }

  if (!chat.groupChat && !chat.members.includes(req.user.toString())) {
    return next(new ErrorHandler("You are not allowed to delete the chat", 403));
  }

  // Delete all messages and attachments on Cloudinary
  const messagesWithAttachments = await Message.find({
    chat: chatId,
    attachments: { $exists: true, $ne: [] },
  });

  const public_ids = [];
  messagesWithAttachments.forEach(({ attachments }) => {
    attachments.forEach(({ public_id }) => {
      public_ids.push(public_id);
    });
  });

  // Perform deletion
  await Promise.all([
    deleteFilesFromCloudinary(public_ids),
    Chat.findByIdAndDelete(chatId),
    Message.deleteMany({ chat: chatId }),
  ]);

  emitEvent(req, REFETCH_CHATS, members);

  return res.status(200).json({
    success: true,
    message: "Chat deleted successfully",
  });
});


const getMessages = tyrCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { page = 1 } = req.query;
  const resultPerPage = 20;
  const skip = (page - 1) * resultPerPage;

  const chat = await Chat.findById(chatId)
  if(!chat ) return next(new ErrorHandler(" chat not found", 400));
  if(!chat.members.includes(req.user.toString())) return next(new ErrorHandler(" Not Allowed to access", 400));

  const [messages,totalMessages] = await Promise.all([Message.find({ chat: chatId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(resultPerPage)
    .populate("sender", "name")
    .lean(),Message.countDocuments({chat:chatId})])

    const totalPages = Math.ceil(totalMessages/resultPerPage) || 0


    return res.status(200).json({
        success: true,
        message: messages.reverse(),
        totalPages
      });
});

export {
  newGroupChat,
  getMyChats,
  getMyGroups,
  addMembers,
  removeMember,
  leaveGroup,
  sendAttachment,
  getChatDetails,
  renameGroup,
  deleteChat,
  getMessages,
};
