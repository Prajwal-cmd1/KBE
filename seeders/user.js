import { Chat } from "../models/chat.js"
import { User } from "../models/user.js"
import {faker,simpleFaker} from "@faker-js/faker"

const createUser = async(numUser)=>{
    try {
        const userPromise = []
        for (let i = 0; i < numUser; i++) {
            const tempUser = await User.create({
                name:faker.person.fullName(),
                username:faker.internet.userName(),
                password:"password",
                bio:faker.lorem.sentence(10),
                avatar:{
                    public_id:faker.system.fileName(),
                    url:faker.image.avatar()
                }
            })
            
            userPromise.push(tempUser)
        }

        await Promise.all(userPromise) //function waits for all user creation promises
        console.log("user created")
        process.exit(1)
    } catch (error) {
        console.log(error)
        process.exit(1)
    }
}



export {createUser}