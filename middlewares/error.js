const errorMiddleware = (err,req,res,next)=>{
    err.message ||="Internal server Error"
    err.statusCode ||=500

    if(err.code===11000){
    const error=Object.keys(err.keyPattern).join(",")
    err.message =`Duplicate field - ${error}`
    err.statusCode =400
    }

    if(err.name==='CastError'){
        const errPath = err.path
        err.message= `Invalid format of ${errPath}`,
        err.status=400
    }
    return res.status(err.statusCode).json({
        success:false,
        message: err.message,
        ...(process.env.NODE_ENV==="DEVELOPMENT" && {error:err})
    })
}

//used as wrapper instead of  try catch  everytime , take func , wrap func under try catch
const tyrCatch =(passedFnc)=>async(req,res,next)=>{
    try {
        await passedFnc(req,res,next)
    } catch (error) {
        next(error)
    }
}

export {errorMiddleware , tyrCatch}