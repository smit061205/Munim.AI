import mongoose from "mongoose";

const userPermissionsSchema = new mongoose.Schema({
  user_id: {
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
userPermissionsSchema.statics.getUserPermissions = async function (userId) {
  let userPermissions = await this.findOne({ user_id: userId });

  // If no permissions found, create default permissions
  if (!userPermissions) {
    userPermissions = await this.create({
      user_id: userId,
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
  userId,
  category,
  allowed,
) {
  const result = await this.findOneAndUpdate(
    { user_id: userId },
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
