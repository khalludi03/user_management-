/* important: Email service for sending verification emails.
 * Uses nodemailer with Gmail SMTP. In development, emails are sent to real addresses.
 * nota bene: SMTP credentials must be configured in .env for emails to work. */
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

// note: Create a reusable transporter using Gmail SMTP settings.
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/* note: Generates a JWT token specifically for email verification.
 * The purpose field distinguishes it from login tokens. */
export function generateVerificationToken(userId: string): string {
    return jwt.sign({ userId, purpose: 'email-verification' }, process.env.JWT_SECRET!, { expiresIn: '24h' });
}

/* important: Sends a verification email with a clickable link.
 * This runs asynchronously after registration — the user is immediately registered. */
export async function sendVerificationEmail(email: string, name: string, token: string) {
    const BASE_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`;
    const link = `${BASE_URL}/verify?token=${token}`;
    await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Verify your email',
        html: `<p>Hi ${name},</p><p>Click <a href="${link}">here</a> to verify your email.</p>`,
    });
}
