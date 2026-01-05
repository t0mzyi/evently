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