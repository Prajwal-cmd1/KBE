import { body, validationResult, check, param ,query} from "express-validator";
import { ErrorHandler } from "../utils/utility.js";

const validateHandler = (req, res, next) => {
  const errors = validationResult(req);
  const errorMessage = errors
    .array()
    .map((error) => error.msg)
    .join(",");

  if (errors.isEmpty()) return next();
  else return next(new ErrorHandler(errorMessage, 400));
};

const registerValidator = () => [
  body("name", "Please enter name").notEmpty(),
  body("username", "Please enter username").notEmpty(),
  body("bio", "Please enter bio").notEmpty(),
  body("password", "Please enter password").notEmpty(),
];

const loginValidator = () => [
  body("username", "Please enter username").notEmpty(),
  body("password", "Please enter password").notEmpty()
];

const newGroupValidator = () => [
  body("name", "Please enter name").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Please enter members")
    .isArray({ min: 2, max: 100 })
    .withMessage("Members must be 2-100")
];

const addMemberValidator = () => [
  body("chatId", "Please enter Chat ID").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Please enter members")
    .isArray({ min: 1, max: 97 })
    .withMessage("Members must be 1-97")
];

const removeMemberValidator = () => [
  body("chatId", "Please enter Chat ID").notEmpty(),
  body("userId", "Please enter User ID").notEmpty()
];

const leaveGroupValidator = () => [
  param("id", "Please enter Chat ID").notEmpty()
];

const sendAttachmentValidator = () => [
  body("chatId", "Please enter Chat ID").notEmpty(),
  
];

const ChatIdValidator = () => [
  param("id", "Please enter Chat ID").notEmpty()
];

const renameValidator = () => [
  param("id", "Please enter Chat ID").notEmpty(),
  body("name", "Please enter new Name").notEmpty()
];

const sendrequestValidator = () => [
  body("userId", "Please enter User ID").notEmpty()
];

const acceptrequestValidator = () => [
  body("requestId", "Please enter Request ID").notEmpty(),
  body("accept").notEmpty().withMessage("Please add Accept").isBoolean().withMessage("accept must be boolean ")
];


export {
  acceptrequestValidator,
  sendrequestValidator,
  registerValidator,
  validateHandler,
  loginValidator,
  newGroupValidator,
  addMemberValidator,
  removeMemberValidator,
  leaveGroupValidator,
  sendAttachmentValidator,
  ChatIdValidator,
  renameValidator
};
