#!/usr/bin/env node
const User = require("../src/models/User");
const env = require("../src/config/env");
const { connectDatabase, disconnectDatabase } = require("../src/config/database");
const { hashPassword } = require("../src/services/passwordService");

const DEFAULT_PASSWORD = "Password123!";

// Imported employees activated for local login testing (password only, profile unchanged).
const ACTIVATE_IMPORTED_EMAILS = ["lewis.kanyi@care.org"];

const SEED_USERS = [
  {
    employeeNumber: "1600",
    name: "Manager One",
    email: "manager@example.com",
    position: "Line Manager",
    department: "Programs",
    role: "admin",
    managerEmail: null,
  },
  {
    employeeNumber: "1601",
    name: "Alice User",
    email: "alice@example.com",
    position: "Officer",
    department: "Programs",
    role: "user",
    managerEmail: "manager@example.com",
  },
  {
    employeeNumber: "1602",
    name: "Super Admin",
    email: "super@example.com",
    position: "System Admin",
    department: "Programs",
    role: "superadmin",
    managerEmail: "manager@example.com",
  },
];

async function upsertActivatedUser(userData, passwordHash) {
  const { managerEmail, ...profile } = userData;

  return User.findOneAndUpdate(
    { email: profile.email },
    {
      $set: {
        ...profile,
        managerEmail,
        isActive: true,
        mustSetPassword: false,
        passwordHash,
        inviteToken: null,
        inviteTokenExpires: null,
      },
    },
    { upsert: true, returnDocument: "after", runValidators: true }
  );
}

async function linkManager(user, managerEmail) {
  if (!managerEmail) {
    user.managerId = null;
    await user.save();
    return user;
  }

  const manager = await User.findOne({ email: managerEmail });

  if (!manager) {
    throw new Error(`Manager not found for ${user.email}: ${managerEmail}`);
  }

  user.managerId = manager._id;
  await user.save();
  return user;
}

async function activateImportedUser(email, passwordHash) {
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    return null;
  }

  user.passwordHash = passwordHash;
  user.mustSetPassword = false;
  user.inviteToken = null;
  user.inviteTokenExpires = null;
  await user.save();
  return user;
}

async function seedUsers({ password = DEFAULT_PASSWORD } = {}) {
  const passwordHash = await hashPassword(password);
  const seeded = [];

  for (const userData of SEED_USERS) {
    const user = await upsertActivatedUser(userData, passwordHash);
    seeded.push(user);
  }

  for (const userData of SEED_USERS) {
    const user = await User.findOne({ email: userData.email });
    await linkManager(user, userData.managerEmail);
  }

  for (const email of ACTIVATE_IMPORTED_EMAILS) {
    const user = await activateImportedUser(email, passwordHash);
    if (user) {
      seeded.push(user);
    }
  }

  return seeded.map((user) => ({
    name: user.name,
    email: user.email,
    role: user.role,
  }));
}

async function run() {
  await connectDatabase(env.mongodbUri);
  const users = await seedUsers();
  await disconnectDatabase();

  console.log("Seed data ready. Log in with Password123!");
  console.log("");
  for (const user of users) {
    console.log(`  ${user.role.padEnd(11)} ${user.email} (${user.name})`);
  }
}

if (require.main === module) {
  run().catch(async (error) => {
    console.error("Seed failed:", error.message);
    await disconnectDatabase();
    process.exit(1);
  });
}

module.exports = {
  DEFAULT_PASSWORD,
  SEED_USERS,
  seedUsers,
};
