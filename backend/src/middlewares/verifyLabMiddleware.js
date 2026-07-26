const db = require("../config/db");

/**
 * Strict Middleware: Blocks unlinked/unverified labs from executing any operational endpoints.
 */
const requireRazorpayVerification = async (req, res, next) => {
  try {
    const labId = req.user.id;

    const result = await db.query(
      `SELECT is_verified, razorpay_account_id, razorpay_account_status FROM labs WHERE lab_id = $1`,
      [labId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Diagnostic center not found." });
    }

    const lab = result.rows[0];

    if (!lab.is_verified || !lab.razorpay_account_id || lab.razorpay_account_status !== "ACTIVATED") {
      return res.status(403).json({
        success: false,
        error: "Action Restricted: You must connect and verify your Razorpay Linked Account under Payouts & Bank before accessing lab operations.",
        requires_razorpay_setup: true,
      });
    }

    next();
  } catch (error) {
    console.error("Lab Verification Middleware Error:", error);
    res.status(500).json({ success: false, error: "Internal server error during verification check." });
  }
};

module.exports = { requireRazorpayVerification };
