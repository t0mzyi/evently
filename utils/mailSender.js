import nodemailer from 'nodemailer'

export const mailSender = async(emailAddress,title,body) => {
    try{
        let transporter = nodemailer.createTransport({
            host : process.env.MAIL_HOST,
            port: 587,
            secure : false,
            auth : {
                user : process.env.MAIL_USER,
                pass : process.env.MAIL_PASS,
            }
        })
        let info = await transporter.sendMail({
            from:'evently otp verification',
            to:  emailAddress,
            subject : title,
            html : body,

        })
        console.log("email sent")
        return info
    }catch(err){
        console.log(`err in mailSender`,err)
    }
}