import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { v2 as cloudinary } from "cloudinary";
import { getBase64, getSockets } from "../lib/helper.js";

// set token in cookie
const cookieOption = {
  maxAge: 15 * 24 * 60 * 60 * 1000,
  sameSite: "none",
  httpOnly: true,
  secure: true,
};
const sendToken = (res, user, code, message) => {
  const token = jwt.sign({ _id: user._id }, process.env.SECRET_JWT);
  res.status(code).cookie("token", token, cookieOption).json({
    success: true,
    user,
    message,
  });
};

const emitEvent = (req, event, users, data) => {
  const  io = req.app.get("io")
  const userSockets = getSockets(users)
  io.to(userSockets).emit(event,data)
};

const uploadFilesToCloudinary = async (files = []) => {
  const uploadPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        getBase64(file),
        {
          resource_type: "auto",
          public_id: uuid(),
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
    });
  });

  try {
    const results = await Promise.all(uploadPromises);

    const formattedResults = results.map((result) => ({
      public_id: result.public_id,
      url: result.secure_url,
    }));

    return formattedResults;
  } catch (error) {
    throw new Error("Error uploading files to CLoudinary", error);
  }
};

const deleteFilesFromCloudinary = async (public_ids) => {
  try {
    // Create an array of promises to delete each file by its public_id
    const deletePromises = public_ids.map(public_id => {
      return cloudinary.uploader.destroy(public_id);
    });

    // Wait for all delete operations to complete
    await Promise.all(deletePromises);

    console.log('All files deleted successfully from Cloudinary');
  } catch (error) {
    console.error('Error deleting files from Cloudinary', error);
    throw new Error('Failed to delete files from Cloudinary');
  }
};

export {
  sendToken,
  cookieOption,
  emitEvent,
  deleteFilesFromCloudinary,
  uploadFilesToCloudinary,
};
