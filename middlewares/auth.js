import { User } from "../models/user.js";
import { ErrorHandler } from "../utils/utility.js";
import { tyrCatch } from "./error.js";
import jwt from "jsonwebtoken";

// to check user is login or not
const isAuthenticated = tyrCatch(async (req, res, next) => {
  // get token from browser cookie
  const token = req.cookies["token"];
  if (!token) return next(new ErrorHandler("Please login to access", 401));

  const decodedData = jwt.verify(token, process.env.SECRET_JWT);
  // add new property user to req onject and can be accesed after this middleware
  req.user = decodedData._id;
  next();
});



const socketAuthenticator = async(err,socket , next)=>{
  try {
    if(err) return next(err)
    const authToken = socket.request.cookies["token"]
    if(!authToken) return  next(new ErrorHandler("Login to access",401))

    const decodedData = jwt.verify(authToken,process.env.SECRET_JWT)
    const user =await User.findById(decodedData._id)
    if(!user)return  next(new ErrorHandler("Login to access",401))
    socket.user = user
    return next()

  } catch (error) {
    return next(new ErrorHandler("Login to access",401))
  }
}

export { isAuthenticated,socketAuthenticator };
