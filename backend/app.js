import express from 'express'
import dotenv from 'dotenv'
import connectDB from './src/db/index.js'
const app = express()

dotenv.config({
    path: './.env'
})

app.get('/', (req, res)=>{
    res.send("<h1>Home</h1>")
}
)
connectDB()
app.listen(process.env.PORT, ()=>{
    console.log(`App is Listening on: http://localhost:${process.env.PORT}`)
})