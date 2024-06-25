import bcryptjs from "bcryptjs";
import { User } from "../models/user.js";
import { cookieOption, emitEvent, sendToken, uploadFilesToCloudinary } from "../utils/features.js";
import { tyrCatch } from "../middlewares/error.js";
import { ErrorHandler } from "../utils/utility.js";
import { Chat } from "../models/chat.js";
import { Request } from "../models/request.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";

const { compare } = bcryptjs;
//login and save token in cookie
const login = tyrCatch(async (req, res, next) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username }).select("+password");
  if (!user) return next(new ErrorHandler("Invalid crdentials", 404));

  // compare psswd if user found using bcrypt compare function
  const isMatch = await compare(password, user.password);
  if (!isMatch) return next(new ErrorHandler("Invalid credentials", 404));
  sendToken(res, user, 200, `Welcome Back ${user.name}`);
});

// create a user save to db and save token in  cookie
const newUser = tyrCatch(async (req, res,next) => {
  const { name, username, password, bio } = req.body;

  const file = req.file
  if(!file) return next(new ErrorHandler("Please upload Avatar"))

    const result = await uploadFilesToCloudinary([file])
  const avatar = {
    public_id: result[0].public_id,
    url: result[0].url,
  };
  const user = await User.create({
    name,
    bio,
    username,
    password,
    avatar,
  });

  sendToken(res, user, 201, "user created successfully");
});

const getMyProfile = tyrCatch(async (req, res, next) => {
  const user = await User.findById(req.user).select("-password");
  if (!user) return next(new ErrorHandler("User not found", 404));
  res.status(200).json({
    success: true,
    data: user,
  });
});

const logout = tyrCatch(async (req, res) => {
  res
    .status(200)
    .cookie("token", "", { ...cookieOption, maxAge: 0 })
    .json({
      success: true,
      message: "logout succesfully",
    });
});

const searchUser = tyrCatch(async (req, res) => {
  const { name = "" } = req.query;

  //Finding all my chats
  const myChats = await Chat.find({ groupChat: false, members: req.user });

  //form myChats , me and friends flattens to an array
  const allUserFromMyChat = myChats.flatMap((chat) => chat.members);

  // all user except me and my friends i.e whom i havent chatted
  const allUserExceptMeAndMyFriends = await User.find({
    _id: { $nin: allUserFromMyChat },
    name: { $regex: name, $options: "i" },
  });

  //modifying response
  const user = allUserExceptMeAndMyFriends.map(({ _id, name, avatar }) => ({
    _id,
    name,
    avatar: avatar.url,
  }));

  return res.status(200).json({
    success: true,
    user,
  });
});

const sendFriendRequest = tyrCatch(async (req, res, next) => {
  const { userId } = req.body;
  const request = await Request.findOne({
    $or: [
      { sender: req.user, receiver: userId },
      { sender: userId, receiver: req.user },
    ],
  });

  if (request) return next(new ErrorHandler("Request already sent ", 400));

  await Request.create({
    sender: req.user,
    receiver: userId,
  });

  // notify reciever
  emitEvent(req, NEW_REQUEST, [userId]);

  res.status(200).json({
    success: true,
    message: "Friend Request Sent",
  });
});

const acceptFriendRequest = tyrCatch(async (req, res, next) => {
  const { requestId, accept } = req.body;

  const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("receiver", "name");

  if (!request) return next(new ErrorHandler("Request not Found ", 400));

  if (request.receiver._id.toString() !== req.user.toString())
    return next(new ErrorHandler("not nauthorize to accept the request ", 401));

  if (!accept) {
    await request.deleteOne();
    return res.status(200).json({
      success: true,
      message: "Friend Request rejected",
    });
  }

  const members = [request.receiver._id, request.sender._id];

  await Promise.all([
    Chat.create({
      members,
      name: `${request.sender.name}-${request.receiver.name}`,
    }),
    request.deleteOne(),
  ]);

  emitEvent(req, REFETCH_CHATS, members);

  res.status(200).json({
    success: true,
    message: "Friend Request accepted",
    senderId: request.sender._id,
  });
});

const getMyNotifications = tyrCatch(async (req, res) => {
  const requests = await Request.find({ receiver: req.user }).populate(
    "sender",
    "name avatar"
  );

  const allRequest = requests.map(({ _id, sender }) => ({
    _id,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar.url,
    },
  }));

  return res.status(200).json({
    success: true,
    allRequest,
  });
});

const getMyFriends = tyrCatch(async (req, res) => {
  const chatId = req.query.chatId;
  const chats =await Chat.find({ members: req.user, groupChat: false }).populate(
    "members",
    "name avatar"
  );

  const friends = chats.map(({ members }) => {
    const otherUser = getOtherMember(members, req.user);
    return{
      _id:otherUser._id,
      name:otherUser.name,
      avatar:otherUser.avatar.url
    }
  });

  if(chatId){
    const chat = await Chat.findById(chatId)

    const availableFriends= friends.filter((friend)=>!chat.members.includes(friend._id))
    return res.status(200).json({
      success: true,
      friends:availableFriends,
    });
  }else{
    return res.status(200).json({
      success: true,
      friends,
    });
  }

  
});

export {
  getMyFriends,
  login,
  newUser,
  getMyProfile,
  logout,
  searchUser,
  sendFriendRequest,
  acceptFriendRequest,
  getMyNotifications,
};
