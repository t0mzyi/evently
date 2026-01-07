import userDb from "../../model/userDb.js"
import otpDb from "../../model/otpDb.js"
import bcrypt from 'bcrypt'
import { otpCreator } from '../../utils/otpGenerator.js'


export const signUpVerify = async (data) => {
    const {emailAddress} = data
    
    const existingUser = await userDb.findOne({emailAddress})

    if(existingUser){
        throw new Error("User already registered")
    }
    await otpCreator(emailAddress)
    return {message : "OTP SENT SUCESSFULYYY"}
}

export const verifyOtp = async (emailAddress,otp) => {
    
        const recentOtp = await otpDb.findOne({emailAddress}).sort({createdAt : -1})
        if(!recentOtp){
            throw new Error("Otp sending failed")
        }
        if(recentOtp.otp != otp ){
            throw new Error("Worng Otp")
        }     
}

export const createUser = async (userData) => {
    const newUser = await userDb.create(userData)
    console.log('New user created',newUser.firstName)
    return newUser
}

export const resendOtpService = async (emailAddress) => {
    await otpCreator(emailAddress)
    return {message : "New otp sent sucessfully"}
}

export const signInVerify = async (data) => {
    const {emailAddress,password} = data

    const user = await userDb.findOne({emailAddress})
    if(!user){
        throw new Error("Invalid email or password (e)")
    }
    if(!user.password){
        throw new Error("emailID is registered through google please login using google")
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

export const forgotPassVerify = async(emailAddress) => {
    const emailExist = await  userDb.findOne({emailAddress})
    if(!emailExist){
        throw new Error("User doesnt exists")
    }
    if(!emailExist.password){
        throw new Error("This account is linked with Google. Please sign in using Google  / login and then set a passwords")
    }   

    await otpCreator(emailAddress)
    return true
}

export const forgotPassSessionExists = async(userId) => {
    const user = await userDb.findById(userId)
    await otpCreator(user.emailAddress)
    return user
}


export const updatePassword = async (emailAddress,newPassword) => {
    
    const password = await bcrypt.hash(newPassword,10)

    const updatedUser = await userDb.findOneAndUpdate(
        {emailAddress : emailAddress },
        {password : password},
        {new : true}
    )
    if(!updatedUser){
        throw new Error("Update failed / User doesnt found")
    }
    return true
}




