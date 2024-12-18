const corsOption = {
    origin:["*","http://localhost:5173","http://localhost:4173","https://knock-frontend.vercel.app",process.env.CLIENT_URL],
    methods:["GET","POST","PUT","DELETE"],
    credentials: true,
}


export {corsOption}
