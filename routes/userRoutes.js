import express from 'express'
import { signUp , signUpPost,otpHandler, resentOtp, signIn,signInPost, otpPage, forgotPassword, forgotPasswordPost, resetPassPatch, resetPassword} from '../controller/user/authController.js'
import { googleAuth, googleAuthCallbackMiddleware, googleAuthSuccess } from '../controller/user/googleAuthController.js';
import { otpGuard, resetPasswordGuard } from '../middlewares/flowMiddleware.js';
import { editProfile, getProfile } from '../controller/user/profileController.js';
const router = express.Router()

router.get('/', (req,res) => res.render('user/foryou'))

router.get('/signUp', signUp )
router.post('/signUp', signUpPost )


//google auth
router.get('/auth/google', googleAuth);
router.get('/auth/google/callback', googleAuthCallbackMiddleware, googleAuthSuccess);

router.get('/signIn', signIn)
router.post('/signIn', signInPost)

router.get("/otp", otpGuard,otpPage)
router.post("/otp",otpGuard, otpHandler)
router.post('/resend-otp',resentOtp)

//forgotpassword flow
router.get('/forgot-password',forgotPassword)
router.post('/forgot-password',forgotPasswordPost)

//resetpassword flow
router.get('/reset-password',resetPasswordGuard,resetPassword)
router.patch('/reset-password',resetPasswordGuard, resetPassPatch)

router.get('/dashboard',getProfile)
router.get('/dashboard/editProfile',editProfile)

router.get('/foryou',(req,res) => res.render('user/foryou',{userId : req.session.user}))


export default router
