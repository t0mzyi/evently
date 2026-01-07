import passport from "passport";
import {Strategy as GoogleStrategy} from 'passport-google-oauth20'
import userDb from "../model/userDb.js";


passport.use(new GoogleStrategy({
    clientID : process.env.CLIENT_ID,
    clientSecret : process.env.CLIENT_SECRET,
    callbackURL : "http://localhost:3000/auth/google/callback"
},  async (accessToken,refreshToken,profile,done) => {
        try{
            let user = await userDb.findOne({emailAddress : profile.emails[0].value})

            if(user){
                if(user.isBlocked){
                    return done(null,false,{message : "User is blocked"})
                }
                if(!user.googleId){
                    user.googleId = profile.id
                    await user.save()
                }
                return done(null,user)
            }
            const photo = profile.photos && profile.photos.length > 0 
                  ? profile.photos[0].value 
                  : null;
            let lastName = "\u200B"
            if(profile.name.familyName){
                lastName = profile.name.familyName
            }
            user = await userDb.create({
                googleId : profile.id,
                emailAddress : profile.emails[0].value,
                firstName: profile.name.givenName,
                lastName,
                avatarUrl : photo
            })
            return done(null,user)
        }catch(err){
            return done(err,null)
        }
}
))

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    const user = await userDb.findById(id);
    done(null, user);
});