import {signUpVerify,signInVerify,resendOtpService, forgotPassVerify, verifyOtp, createUser, updatePassword} from '../../service/user/authService.js'
import bcrypt from 'bcrypt'

export const signUp = (req,res) => {
    res.render('user/auth' , {mode : "register"})
}
export const signIn = (req,res) => {
    return res.render('user/auth',{mode : "login"})
}
export const forgotPassword = (req,res) => {
    return res.render('user/forgot-password')
}
export const otpPage = (req,res) => {
    return res.render('user/otp')
}
export const resetPassword = (req,res) => {
    return res.render('user/reset-password')
}

export const forgotPasswordPost = async (req,res) => {
    try{
        const {emailAddress} = req.body

        req.session.tempUserData = null
        req.session.forgotPassEmail = emailAddress 

        await forgotPassVerify(emailAddress)

        req.session.otpRequested = true

        return res.status(200).json({
            success : true,
            redirectUrl : '/otp'
        })
    }catch(err){
        console.log(`error in forgotPasswordPost`,err.message)
        return res.status(400).json({
            success : false,
            message : err.message
        })
    }
}



export const resetPassPatch = async (req,res) => {
    try{
        const {newPassword} = req.body
        const email = req.session.forgotPassEmail

        if(!email || !  newPassword){
            return res.status(403).json({ 
                success: false, 
                message: "Session expired or some error please redo again." 
            });
        }

        await updatePassword(email,newPassword)

        req.session.forgotPassEmail = null;
        req.session.canResetPassword = null;
        req.session.otpRequested = false;

        return res.status(200).json({
            success: true,
        });
    }catch (err) {
        console.error("Error in resetPasswordPatch:", err.message);
        return res.status(500).json({ 
            success: false, 
            message: err.message || "Failed to update password. Please try again." 
        });
    }
}




export const otpHandler = async (req,res) => {
    try{
        const {otp} = req.body
        const {tempUserData,forgotPassEmail} = req.session

        const targetEmail = tempUserData ? tempUserData.emailAddress : forgotPassEmail
        if(!targetEmail){
            return res.status(400).json({
                success:false,
                message: "Session exipired please login again"
            })
        }

        await verifyOtp(targetEmail,otp)

        req.session.otpRequested = false

        if(tempUserData){
            const newUser = await createUser(tempUserData)
            req.session.tempUserData = null
            req.session.user = newUser._id
            return res.status(200).json({ success: true, redirectUrl: '/foryou' })
        }else if(forgotPassEmail){
            req.session.canResetPassword = true
            return res.status(200).json({ success: true, redirectUrl: '/reset-password' })
        }
        return res.status(400).json({ success: false, message: "Invalid session state" })
    }catch(err){
        console.log(`err in otpHandler`,err.message)
        return res.status(400).json({success:false,message:err.message || "OTP verification failed"})
    }
}
export const signInPost = async (req,res) => {
    try{
        const user = await signInVerify(req.body)
        req.session.user = user._id

        return res.status(200).json({
            success : true,
            redirectUrl : '/foryou'
        })

    }catch(err){
        console.log(`error in signInPost`,err.message)
        let statusCode = 401
        if(err.message.includes("blocked")) statusCode = 403
        return res.status(statusCode).json({
            success : false,
            message : err.message
        })
    }

}


export const signUpPost = async (req, res) => {
    try {

        await signUpVerify(req.body);

        
        req.session.tempUserData = req.body
        const hashedPass = await bcrypt.hash(req.session.tempUserData.password,10)
        req.session.tempUserData.password = hashedPass
        
        req.session.otpRequested = true

        return res.status(200).json({ 
            success: true,
            redirectUrl: '/otp' 
        });
    } catch (error) {
        console.log(`err in signUpPost`,error.message)
        return res.status(500).json({ success: false, message: error.message ||"Server error" });
    }
}


export const resentOtp = async (req,res) => {
    try{
        const email = req.session.tempUserData?.emailAddress || req.session.forgotPassEmail
        if(!email){
            return res.status(400).json({
                success : false,
                message : "Session expired please retry the process again"
            })
        }
        const result = await resendOtpService(email)
        return res.status(200).json({success : true , message : result.message })
    }catch(err){
        console.log('err in resentOtp',err.message)
        return res.status(500).json({success : false, message : "Failed to resnt otp please try again"})

    }
}




