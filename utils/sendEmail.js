import nodemailer from 'nodemailer';

export default async function sendEmail(email, subject, text) {
  try {
    const transporter = nodemailer.createTransport({
      service: process.env.HOST,
      // service: 'hotmail',
      port: 587,
      secure: true,
      auth: {
        user: process.env.USER,
        pass: process.env.PASS,
      },
    });
    await transporter.sendMail({
      from: process.env.USER,
      to: email,
      subject: subject,
      text: text,
    });
    console.log('email sent sucessfully');
  } catch (error) {
    console.log(error);
  }
}
