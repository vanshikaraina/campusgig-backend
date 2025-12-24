// backend/utils/notificationTemplates.js

export const notificationTemplates = {
    jobPosted: (jobTitle, userName) => ({
        subject: `New Job Posted: ${jobTitle}`,
        html: `<p>Hi ${userName}, a new job "${jobTitle}" has been posted. Check it out!</p>`,
        sms: `Hi ${userName}, new job posted: "${jobTitle}".`
    }),
    bidAccepted: (jobTitle, userName, bidAmount) => ({
        subject: `Bid Accepted: ${jobTitle}`,
        html: `<p>Hi ${userName}, your bid of ₹${bidAmount} for "${jobTitle}" has been accepted!</p>`,
        sms: `Hi ${userName}, your bid of ₹${bidAmount} for "${jobTitle}" has been accepted!`
    }),
    jobAccepted: (jobTitle, userName, studentName) => ({
        subject: `Job Accepted: ${jobTitle}`,
        html: `<p>Hi ${userName}, your job "${jobTitle}" has been accepted by ${studentName}!</p>`,
        sms: `Hi ${userName}, your job "${jobTitle}" has been accepted by ${studentName}.`
    })
};