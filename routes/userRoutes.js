import express from 'express'
import { signUp , signUpPost,otpHandler, resentOtp, signIn,signInPost, otpPage, forgotPassword, forgotPasswordPost, resetPassPatch, resetPassword} from '../controller/user/authController.js'
import { googleAuth, googleAuthCallbackMiddleware, googleAuthSuccess } from '../controller/user/googleAuthController.js';
import { ifAuth, isAuth, otpGuard, resetPasswordGuard } from '../middlewares/flowMiddleware.js';
import { editProfile, getEditProfile, getProfile } from '../controller/user/profileController.js';
import { upload } from '../middlewares/multerUpload.js';
import { foryou } from '../controller/user/foryouController.js';
const router = express.Router()

router.get('/', (req,res) => res.redirect('/foryou'))
router.get('/foryou', foryou)



router.get('/signUp', signUp )
router.post('/signUp', signUpPost )


//google auth
router.get('/auth/google', ifAuth,googleAuth);
router.get('/auth/google/callback',ifAuth, googleAuthCallbackMiddleware, googleAuthSuccess);

router.get('/signIn',ifAuth, signIn)
router.post('/signIn',ifAuth, signInPost)

router.get("/otp", otpGuard,otpPage)
router.post("/otp",otpGuard, otpHandler)
router.post('/resend-otp',resentOtp)

//forgotpassword flowwwwee
router.get('/forgot-password',forgotPassword)
router.post('/forgot-password', forgotPasswordPost)

//resetpassword flow
router.get('/reset-password',resetPasswordGuard,resetPassword)
router.patch('/reset-password' ,resetPasswordGuard, resetPassPatch)



//auth pages
router.get('/dashboard',isAuth,getProfile)

router.get('/dashboard/editProfile',isAuth,getEditProfile)
router.patch('/dashboard/editProfile',isAuth, upload.single('avatar'), editProfile)



export default router
