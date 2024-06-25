import { Chat } from "../models/chat.js"
import { Message } from "../models/message.js";
import { User } from "../models/user.js"
import {faker,simpleFaker} from "@faker-js/faker"

const createSingleChats = async (chatsCount) => {
    try {
      const users = await User.find().select("_id");
      const chatsPromise = [];
  
      for (let i = 0; i < users.length; i++) {
        for (let j = i + 1; j < users.length; j++) {
          chatsPromise.push(
            Chat.create({
              name: faker.lorem.word(2),
              members: [users[i], users[j]]
            })
          );
        }
      }
  
      await Promise.all(chatsPromise);
      console.log("Single chats created");
      process.exit(1);
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
  };
  


  const createGroupChats = async (numChats) => {
    try {
      const users = await User.find().select("_id");
      const chatsPromise = [];
  
      for (let i = 0; i < numChats; i++) {
        const numMembers = faker.number.int({ min: 3, max: users.length });
        const members = [];
  
        while (members.length < numMembers) {
          const randomIndex = Math.floor(Math.random() * users.length);
          const randomUser = users[randomIndex];
          if (!members.includes(randomUser)) {
            members.push(randomUser);
          }
        }
  
        const chat = Chat.create({
          groupChat: true,
          name: faker.lorem.word(1),
          members,
          creator: members[0]
        });
        chatsPromise.push(chat);
      }
  
      await Promise.all(chatsPromise);
      console.log("Group chats created");
      process.exit(1);
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
  };
  


  const createMessage = async (numMessage) => {
    try {
      const users = await User.find().select("_id");
      const chats = await Chat.find().select("_id");
  
      const messagePromise = [];
  
      for (let i = 0; i < numMessage; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const randomChat = chats[Math.floor(Math.random() * chats.length)];
  
        messagePromise.push(
          Message.create({
            chat: randomChat,
            sender: randomUser,
            content: faker.lorem.sentence()
          })
        );
      }
  
      await Promise.all(messagePromise);
      console.log("Messages created");
      process.exit(1);
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
  };
  

  const createMessageInChat = async (chatId, numMessages) => {
    try {
      const users = await User.find().select("_id");
  
      const messagePromise = [];
  
      for (let i = 0; i < numMessages; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
  
        messagePromise.push(
          Message.create({
            chat: chatId,
            sender: randomUser,
            content: faker.lorem.sentence()
          })
        );
      }
  
      await Promise.all(messagePromise);
      console.log("Messages created in chat");
      process.exit(1);
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
  };
  

export {createSingleChats,createMessage,createGroupChats,createMessageInChat}