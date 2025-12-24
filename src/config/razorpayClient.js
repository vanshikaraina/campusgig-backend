// import Razorpay from "razorpay";

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// // module.exports = { razorpay };
// export default razorpay;

// src/config/razorpayClient.js
import Razorpay from "razorpay";

let razorpayInstance = null;

export function getRazorpayInstance() {
    if (!razorpayInstance) {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            console.warn('⚠ Razorpay keys missing — skipping initialization');
            return null; // don’t crash
        }
        razorpayInstance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        console.log('✅ Razorpay initialized');
    }
    return razorpayInstance;
}
