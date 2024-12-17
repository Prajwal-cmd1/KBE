import { userSocketIDs } from "../api/index.js"

export const getOtherMember=(members,userId)=>{
    return members.find((member)=>member._id.toString()!==userId.toString())
}


//etrieve the socket IDs associated with each user in the provided array of users.
export const getSockets=(users=[])=>{

    const sockets= users.map((user)=>userSocketIDs.get(user.toString()))
    return sockets
}


export const getBase64 = (file) => `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
