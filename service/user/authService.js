import userDb from "../../model/userDb.js"
import otpDb from "../../model/otpDb.js"
import otpGenerator from 'otp-generator'
import bcrypt from 'bcrypt'


export const signUpVerify = async (data) => {
    const {firstName, lastName , emailAddress, password} = data
    
    const existingUser = await userDb.findOne({emailAddress})

    if(existingUser){
        throw new Error("User already registered")
    }

    let otp = otpGenerator.generate(6,{
        upperCaseAlphabets : false,
        lowerCaseAlphabets : false,
        specialChars : false,
    })
    await otpDb.create({emailAddress,otp})
    return {message : "OTP SENT SUCESSFULYYY"}
}

export const verifyAndCreateAccount = async (userData,otp) => {
    
        const recentOtp = await otpDb.findOne({emailAddress : userData.emailAddress}).sort({createdAt : -1})
        if(!recentOtp){
            throw new Error("Otp sending failed")
        }
        if(recentOtp.otp != otp ){
            throw new Error("Worng Otp")
        }
        
        const newUser = await userDb.create(userData)
        return newUser
    
}

export const resendOtpService = async (emailAddress) => {
    const newOtp = otpGenerator.generate(6,
        {upperCaseAlphabets : false,
            lowerCaseAlphabets : false,
            specialChars : false
        }
    )

    await otpDb.create({emailAddress , otp : newOtp})

    return {message : "New otp sent sucessfully"}

}

export const signInVerify = async (data) => {
    const {emailAddress,password} = data

    const user = await userDb.findOne({emailAddress})
    if(!user){
        throw new Error("Invalid email or password (e)")
    }
    if(!user.password){
        throw new Error
    }
    
    if(user.isBlocked){
        throw new Error("User has been blocked by admin")
    }

    const passMatch = await bcrypt.compare(password,user.password)
    if(!passMatch){
        throw new Error("Invalid email or password (p)")
    }
    
    return user

}