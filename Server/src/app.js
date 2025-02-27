import express from "express"
import cookieParser from "cookie-parser"
import cors from 'cors'


const app = express()

app.use(cors({
    origin: "*",
    credential: true,
}));


app.use(express.json({limit: "16kb"}))
app.use(express.static("public"))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(cookieParser()) // middleware to access or modify the cookies sent by the browser helps you to parse and handle cookies in HTTP request
app.use((err,req,res,next)=>{
    if(err.status === 413){
        return res.json({
            success: false,
            message: "payload overloaded"
        })
    }
})


// routes import
import userRouter from "./routes/user.routes.js"
app.use("/api/v1/auth", userRouter)

export {app}