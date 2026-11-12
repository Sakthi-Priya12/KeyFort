'use strict';
/**
 * Safe first-admin setup. No default admin exists.
 *   node scripts/create-admin.js            -> interactive (hidden password prompt)
 *   node scripts/create-admin.js --if-none  -> only if there is no admin yet (used by START-KEYFORT.bat)
 *   Or set ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD environment variables for a non-interactive run
 *   (e.g. in a hosting shell). The password is validated with the DFA + Regex policy and stored hashed.
 */
const bcrypt = require('bcryptjs');
const config = require('../config/env');
const { connectDB, mongoose } = require('../config/db');
const User = require('../models/User');
const { validatePassword } = require('../services/passwordValidator');
const { isEmail, isName } = require('../utils/validators');
const { ask, askHidden } = require('./prompt');

(async () => {
  try {
    await connectDB();
    const ifNone = process.argv.includes('--if-none');
    const existing = await User.countDocuments({ role: 'admin' });
    if (ifNone && existing > 0) { console.log('Administrator account already exists.'); return; }

    let name = process.env.ADMIN_NAME;
    let email = process.env.ADMIN_EMAIL;
    let password = process.env.ADMIN_PASSWORD;
    const interactive = !(name && email && password);

    if (interactive) {
      console.log('\n=== Create the first KeyFort administrator ===');
      console.log('Password rules: 8+ characters with uppercase, lowercase, number and special character.\n');
      name = await ask('Admin name: ');
      email = await ask('Admin email: ');
      for (;;) {
        password = await askHidden('Admin password (hidden): ');
        const r = validatePassword(password);
        if (!r.accepted) { console.log(`  Not accepted. Missing: ${r.missing.join('; ')}`); continue; }
        if (r.strength.label === 'Weak') { console.log('  Too common/predictable. Try another.'); continue; }
        const again = await askHidden('Repeat password: ');
        if (again !== password) { console.log('  Passwords did not match.'); continue; }
        break;
      }
    }
    if (!isName(name) || !isEmail(email)) throw new Error('Invalid admin name or email.');
    const r = validatePassword(password);
    if (!r.accepted || r.strength.label === 'Weak') throw new Error('Admin password does not meet the policy.');

    const emailN = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, config.BCRYPT_ROUNDS);
    const found = await User.findOne({ email: emailN });
    if (found) {
      found.role = 'admin'; found.passwordHash = passwordHash; found.isActive = true;
      found.passwordChangedAt = new Date(); found.failedLoginAttempts = 0; found.lockUntil = null;
      await found.save();
      console.log(`\nExisting user ${emailN} promoted to administrator.`);
    } else {
      await User.create({ name: name.trim(), email: emailN, passwordHash, role: 'admin' });
      console.log(`\nAdministrator ${emailN} created. Sign in at /admin/login`);
    }
  } catch (err) {
    console.error(`\n[X] ${err.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
})();
