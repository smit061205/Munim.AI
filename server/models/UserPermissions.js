import mongoose from "mongoose";

const userPermissionsSchema = new mongoose.Schema({
  clerkId: {
    type: String,
    required: true,
    unique: true,
  },
  permissions: {
    assets: {
      type: Boolean,
      default: true,
    },
    liabilities: {
      type: Boolean,
      default: true,
    },
    transactions: {
      type: Boolean,
      default: true,
    },
    investments: {
      type: Boolean,
      default: true,
    },
    epf: {
      type: Boolean,
      default: true,
    },
    creditScore: {
      type: Boolean,
      default: true,
    },
    aiChat: {
      type: Boolean,
      default: true,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
userPermissionsSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get user permissions with defaults
userPermissionsSchema.statics.getUserPermissions = async function (clerkId) {
  let userPermissions = await this.findOne({ clerkId });

  // If no permissions found, create default permissions
  if (!userPermissions) {
    userPermissions = await this.create({
      clerkId,
      permissions: {
        assets: true,
        liabilities: true,
        transactions: true,
        investments: true,
        epf: true,
        creditScore: true,
        aiChat: true,
      },
    });
  }

  return userPermissions.permissions;
};

// Static method to update specific permission
userPermissionsSchema.statics.updatePermission = async function (
  clerkId,
  category,
  allowed,
) {
  const result = await this.findOneAndUpdate(
    { clerkId },
    {
      $set: {
        [`permissions.${category}`]: allowed,
        updatedAt: Date.now(),
      },
    },
    {
      upsert: true,
      new: true,
    },
  );

  return result.permissions;
};

const UserPermissions = mongoose.model(
  "UserPermissions",
  userPermissionsSchema,
);

export default UserPermissions;
