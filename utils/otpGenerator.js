import otpDb from "../model/otpDb.js"
import otpGenerator from 'otp-generator'

export const otpCreator = async (emailAddress) => {
    let otp = otpGenerator.generate(6,{
        upperCaseAlphabets : false,
        lowerCaseAlphabets : false,
        specialChars : false,
    })
    await otpDb.create({emailAddress,otp})
}