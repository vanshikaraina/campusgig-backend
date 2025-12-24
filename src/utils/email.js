// import nodemailer from 'nodemailer';
// import 'dotenv/config';

// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS
//     }
// });

// // changed: accept both text and html. call as sendEmail(to, subject, text, html)
// export async function sendEmail(to, subject, text, html) {
//     try {
//         const info = await transporter.sendMail({
//             from: `"CampusGig" <${process.env.EMAIL_USER}>`,
//             to,
//             subject,
//             text,
//             html
//         });
//         console.log("✅ Email sent:", info.messageId);
//     } catch (err) {
//         console.error("❌ Email Error:", err);
//     }
// }

import nodemailer from 'nodemailer';
import 'dotenv/config';

// Create transporter with retry mechanism
let transporter = null;
let isVerified = false;

function createTransporter() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('EMAIL_USER and EMAIL_PASS must be set in .env file');
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        pool: true, // Use pooled connections
        maxConnections: 5, // Limit concurrent connections
        maxMessages: 100, // Limit messages per connection
        rateDelta: 1000, // Minimum time between messages
        rateLimit: 5 // Maximum messages per rateDelta
    });
}

// Initialize and verify transporter
async function initializeTransporter() {
    try {
        if (!transporter) {
            transporter = createTransporter();
        }
        
        if (!isVerified) {
            await transporter.verify();
            isVerified = true;
            console.log('✅ Email transporter verified and ready');
        }
        
        return true;
    } catch (err) {
        console.error('❌ Email transporter error:', err.message);
        isVerified = false;
        transporter = null;
        throw err;
    }
}

// Initialize on startup
initializeTransporter().catch(err => {
    console.error('Initial email setup failed:', err.message);
});

export async function sendEmail(to, subject, text, html) {
    try {
        // Ensure transporter is ready
        await initializeTransporter();
        
        if (!to || !subject) {
            throw new Error('Email recipient and subject are required');
        }

        console.log(`📧 Sending email to ${to}`);
        const info = await transporter.sendMail({
            from: `"CampusGig" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html,
            headers: {
                'X-Priority': '1', // High priority
                'X-MSMail-Priority': 'High',
                'Importance': 'high'
            }
        });
        
        if (info && info.messageId) {
            console.log('✅ Email sent:', info.messageId);
            return info;
        } else {
            throw new Error('No messageId returned');
        }
    } catch (err) {
        console.error('❌ Email send failed:', err.message);
        // Attempt to re-initialize transporter on failure
        isVerified = false;
        throw err;
    }
}