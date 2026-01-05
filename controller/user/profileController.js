import userDb from "../../model/userDb.js"

export const getProfile = async (req,res) =>{
    try{
        const user = await userDb.findById("695a3e7b942da5e384cbadb9")
        
        
        res.render('user/dash/profile',{user})
    }catch(err){
        console.log('err in getProfile',err.message)
    }
}

export const editProfile = async (req,res) => {
    try{
        const user = await userDb.findById("695a3e7b942da5e384cbadb9")
        
        
        res.render('user/dash/edit-profile',{user})
    }catch(err){
        console.log('err in getEditProfile',err.message)
    }
}