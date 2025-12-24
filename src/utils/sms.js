// backend/utils/sms.js
import fetch from 'node-fetch'; // npm install node-fetch

export async function sendSMS(to, message) {
    try {
        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
            method: 'POST',
            headers: {
                'authorization': process.env.FAST2SMS_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                route: 'v3',
                sender_id: 'TXTIND',
                message: message,
                language: 'english',
                flash: 0,
                numbers: to.replace(/\D/g, '') // remove + or spaces
            })
        });

        const result = await response.json();
        console.log('✅ SMS sent via Fast2SMS:', result);
    } catch (err) {
        console.error('❌ SMS Error (Fast2SMS):', err);
    }
}