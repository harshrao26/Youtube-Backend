import mongoose from "mongoose";
import {DBNAME} from '../constants/dbName.js'
const connectDB = async ()=>{   
    try {
        const res = await mongoose.connect(`${process.env.MONGODB_URI}/${DBNAME}`)
        console.log("MongoDB Connected!!")
        console.log("HOST!!", res.connection.host)

        
    } catch (error) {
        console.log("MONGODB CONNECTION ERROR IN DB FOLDER: ", error)
        process.exit(1)
        
    }
}
export default connectDB