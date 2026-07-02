const crypto = require("crypto");
require("dotenv").config();

// 1. Paste your data here
const order_id = "order_T8eESiYA37wCtK"; // From step 1
const secret = process.env.RAZORPAY_KEY_SECRET;  // From your .env
const fake_payment_id = "pay_MockPayment123"; 

// 2. The script calculates the valid signature
const body = order_id + "|" + fake_payment_id;
const signature = crypto
  .createHmac("sha256", secret)
  .update(body.toString())
  .digest("hex");

// 3. Print the exact JSON you need for Hoppscotch
console.log(JSON.stringify({
  razorpay_order_id: order_id,
  razorpay_payment_id: fake_payment_id,
  razorpay_signature: signature,
  lab_id: 1,                   // Replace with an actual Integer lab_id from your DB
  test_id: 1,                  // Replace with an actual Integer test_id from your DB
  slot_id: 18,                  // Replace with an actual Integer slot_id from your DB
  appointment_date: "2026-07-04" // MUST include a valid future date that matches the slot's day_of_week!
}, null, 2));