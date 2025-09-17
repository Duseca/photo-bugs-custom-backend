import nodemailer from 'nodemailer';
import dotenv from "dotenv";
dotenv.config();
const { SMTP_EMAIL, SMTP_PASSWORD} = process.env;
export default async function sendEmail(email, subject, text) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      secure: true,
      auth: {
      user: SMTP_EMAIL,
      pass: SMTP_PASSWORD,
      },
    });
    await transporter.sendMail({
      from:'PhotoBugs',
      to: email,
      subject: subject,
      text: text,
      html: `<p>${text.replace(/\n/g, "<br/>")}</p>`
    });
    console.log('email sent sucessfully');
  } catch (error) {
    console.log(error);
  }
}
