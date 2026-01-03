import express from 'express'
import { signUp , signUpPost,verifyOtp, resentOtp, signIn,signInPost} from '../controller/user/authController.js'
import { googleAuth, googleAuthCallbackMiddleware, googleAuthSuccess } from '../controller/user/googleAuthController.js';
const router = express.Router()

router.get('/', (req,res) => res.redirect('/foryou'))

router.get('/signUp', signUp )
router.post('/signUp', signUpPost )


//google auth
router.get('/auth/google', googleAuth);
router.get('/auth/google/callback', googleAuthCallbackMiddleware, googleAuthSuccess);

router.get('/signIn', signIn)
router.post('/signIn', signInPost)

router.get("/otp", (req,res) => res.render('user/otp'))
router.post("/otp", verifyOtp)
router.post('/resend-otp',resentOtp)

router.get('/foryou',(req,res) => res.render('user/foryou',{userId : req.session.user}))


export default router
