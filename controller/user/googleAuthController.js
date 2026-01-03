import passport from 'passport';

// This starts the Google process
export const googleAuth = passport.authenticate('google', { 
    scope: ['profile', 'email'] 
});

// This handles the return from Google
export const googleAuthCallbackMiddleware = passport.authenticate('google', { 
    failureRedirect: '/signIn' 
});

// This is your final custom logic (Session management)
export const googleAuthSuccess = (req, res) => {
    req.session.user = req.user._id;
    req.session.isAuth = true;
    res.redirect('/foryou');
};