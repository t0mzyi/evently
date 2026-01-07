export const otpGuard = (req,res,next) => {

    const otpRequested = req.session.otpRequested
    if(!otpRequested){
        return res.redirect('/signUp')
    }
    return next()
}

export const resetPasswordGuard = (req,res,next) => {
    if(req.session.canResetPassword){
        return next()
    }
    return res.redirect('/forgot-password')
}

export const isAuth = (req,res,next) => {
    if(req.session.user){
        return next()
    }
    return res.redirect(`/signIn?status=error&message=${encodeURIComponent("Please login")}`)
}

export const ifAuth = (req,res,next) => {
    if(req.session && req.session.user){
        return res.redirect('/')
    }
    return next()
}