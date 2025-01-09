import { PASSWORD_RESET_REQUEST_TEMPLATE, PASSWORD_RESET_SUCCESS_TEMPLATE, VERIFICATION_EMAIL_TEMPLATE } from "./emailTemplate.js";
import { mailtrapClient, sender } from "./mailtrap.config.js";

export const sendVerificationEmail = async (email, verificationToken) => {
    const recipient = [{email}]

    try{
        const response = await mailtrapClient.send({
            from: sender,
            to: recipient,
            subject: "Verify Your Email",
            html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", verificationToken),
            category: "Email Verification"
        })
        console.log("Email sent successfully", response)    
    }catch(error){
        console.log("Error sending verificatiion",error)
        throw new Error(`Error sending verification email: ${error}`)
    }
    
}
export const sendWelcomeEmail = async (email, name) => {
    const recipient = [{email}]

    try{
        const response = await mailtrapClient.send({
            from: sender,
            to: recipient,
            template_uuid : "67514624-7138-4c49-b95e-bd8c2ae1e73c",
            template_variables: {
				company_info_name: "OBIS Company",
				name: name,
			},
        })
        console.log("Email sent welcome successfully", response)
    }catch(error){
        console.log("Error sending welcome email",error)
        throw new Error(`Error sending welcome email: ${error}`)
    }
}
export const sendPasswordResetEmail = async (email, resetURL) => {
    const recipient = [{email}]
    try{
        const response = await mailtrapClient.send({
            from: sender,
            to: recipient,
            subject: "Reset Your Password",
            html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL),
            category: "Password Reset"
        })
        console.log("Email sent password reset successfully", response)
    }catch(error){
        console.log("Error sending password reset email",error)
        throw new Error(`Error sending password reset email: ${error}`)
    }
}

export const sendResetSuccessEmail = async (email) => {
    const recipient = [{email}]
    try{
        const response = await mailtrapClient.send({
            from: sender,
            to: recipient,
            subject: "Password Changed Successfully",
            html: PASSWORD_RESET_SUCCESS_TEMPLATE.replace("{email}", email),
            category: "Password Changed"
        })
        console.log("Email sent password changed successfully", response)
    }catch(error){
        console.log("Error sending password changed email",error)
        throw new Error(`Error sending password changed email: ${error}`)
    }
}