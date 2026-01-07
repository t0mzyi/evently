import userDb from "../../model/userDb.js"


export const foryou = async (req,res) => {
    
    try{
        if(req.session.user){
            const user = await userDb.findById(req.session.user)
            console.log(user)
            return res.render('user/foryou',{user})
        }
        return res.render('user/foryou')
    }catch(Err){
        console.log(Err)
    }

}