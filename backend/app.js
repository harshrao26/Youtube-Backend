import express from 'express'
import dotenv from 'dotenv'
import connectDB from './src/db/index.js'
import cors from 'cors'
import cookieParser from 'cookie-parser'
const app = express()
dotenv.config({
    path: './.env'
})

app.use(cors({
    origin: process.env.CORS,
    credential: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true,
    limit: "8kb"
}))
app.use(express.static("public"))
app.use(cookieParser())


//Routes
import userRouter from './src/routes/user.route.js'
app.use("/api/v1/users", userRouter)

connectDB()
.then(
    ()=>{
        app.listen(process.env.PORT, ()=>{
            console.log(`App is Listening on: http://localhost:${process.env.PORT}`)
        })
    }
)
.catch(
    (err)=>{
        console.log("APP.js File Error", err)
    }
)

