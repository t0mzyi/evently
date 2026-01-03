import mongoose from "mongoose";

export const connectDb = async () => {
    try{
        const connect = await mongoose.connect(process.env.MONGODB_URL)
        console.log(`Db connection established`)
    }catch(err){
        console.log(`error in db connect`,err)
    }
}