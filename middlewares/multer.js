import multer from "multer";


 const multerExport =multer({
    limits:{
        fileSize:1024*1024*5
    }
})


const singleAvatar = multerExport.single("avatar")
const attachmentsMulter = multerExport.array("files",10)

export {multerExport,singleAvatar,attachmentsMulter}