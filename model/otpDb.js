import mongoose from "mongoose";
import { mailSender } from "../utils/mailSender.js";

const otpSchema = new mongoose.Schema({
    emailAddress : {
        type : String,
        required :  true
    },
    otp : {
        type : String,
        required :  true
    },
    createdAt : {
        type :  Date,
        default : Date.now,
        expires : 300
    }
})

otpSchema.index({ emailAddress: 1, createdAt: -1 })

const sentVerificationMail = async (emailAddress,otp) => {
    try{
        await mailSender(
            emailAddress,
            "Verification email",
            `<h1>Please confirm your OTP</h1>
            <p>Here is your OTP code: ${otp}</p>`
        )
        console.log("OTP stored and verification email sent")
    }catch(err){
        console.log(`error in sentVerificationMail on otpDb`,err)
        throw err
    }
}

otpSchema.pre("save", async function () {
    console.log(`new document otp stored`)
    if(this.isNew){
        await sentVerificationMail(this.emailAddress,this.otp)
    }
    
})

export default mongoose.model("OTP", otpSchema);
