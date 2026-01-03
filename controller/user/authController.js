import {signUpVerify,signInVerify,verifyAndCreateAccount,resendOtpService} from '../../service/user/authService.js'
import bcrypt from 'bcrypt'

export const signUp = (req,res) => {
    res.render('user/auth' , {mode : "register"})
}
export const signIn = (req,res) => {
    res.render('user/auth',{mode : "login"})
}
export const signInPost = async (req,res) => {
    try{
        const user = await signInVerify(req.body)
        req.session.user = user._id

        res.status(200).json({
            success : true,
            redirectUrl : '/foryou'
        })

    }catch(err){
        console.log(`error in signInPost`,err.message)
        let statusCode = 401
        if(err.message.includes("blocked")) statusCode = 403
        res.status(statusCode).json({
            success : false,
            message : err.message
        })
    }

}


export const signUpPost = async (req, res) => {
    try {

        const result = await signUpVerify(req.body);

        
        req.session.tempUserData = req.body
        const hashedPass = await bcrypt.hash(req.session.tempUserData.password,10)
        req.session.tempUserData.password = hashedPass
        

        res.status(200).json({ 
            success: true,
            redirectUrl: '/otp' 
        });
    } catch (error) {
        console.log(`err in signUpPost`,error.message)
        res.status(500).json({ success: false, message: error.message ||"Server error" });
    }
}

export const verifyOtp = async (req,res) => {
    try{
        const tempUserData = req.session.tempUserData
        if(!tempUserData){
            return res.status(400).json({
                success:false,
                message: "Session exipired please login again"
            })
        }

        const {otp} = req.body
        const newUser = await verifyAndCreateAccount(tempUserData,otp)
        req.session.tempUserData = null
        req.session.user = newUser._id

        res.status(200).json({success:true,redirectUrl:'/foryou'})
    }catch(err){
        console.log(`err in verifyOtp`,err.message)
        res.status(400).json({success:false,message:err.message || "OTP verification failed"})
    }
}

export const resentOtp = async (req,res) => {
    try{
        const tempUserData = req.session.tempUserData
        if(!tempUserData){
            return res.status(400).json({
                success : false,
                message : "Session expired please signUp again"
            })
        }
        const result = await resendOtpService(tempUserData.emailAddress)
        res.status(200).json({success : true , message : result.message })
    }catch(err){
        console.log('err in resentOtp',err.message)
        res.status(500).json({success : false, message : "Failed to resnt otp please try again"})

    }
}




