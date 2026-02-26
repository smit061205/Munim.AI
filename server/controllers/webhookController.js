import { Webhook } from "svix";
import User from "../models/User.js";
import { seedNewUser } from "../services/seedService.js";
import { ApiError } from "../middleware/errorHandler.js";

// Handle Clerk webhooks
export const handleWebhook = async (req, res, next) => {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    if (!WEBHOOK_SECRET) {
      throw new ApiError(500, "Webhook secret not configured");
    }

    // Get the headers
    const svix_id = req.headers["svix-id"];
    const svix_timestamp = req.headers["svix-timestamp"];
    const svix_signature = req.headers["svix-signature"];

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      throw new ApiError(400, "Missing webhook headers");
    }

    // Create a new Svix instance with your secret
    const wh = new Webhook(WEBHOOK_SECRET);

    // Verify the webhook payload
    const payload = await wh.verify(JSON.stringify(req.body), {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });

    // Handle the webhook
    const { type, data } = payload;

    switch (type) {
      case "user.created":
        await handleUserCreated(data);
        break;
      case "user.updated":
        await handleUserUpdated(data);
        break;
      case "user.deleted":
        await handleUserDeleted(data);
        break;
      default:
        // Unhandled webhook type
        console.log(`Unhandled webhook type: ${type}`);
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Handle user creation
async function handleUserCreated(data) {
  const { id, email_addresses, first_name, last_name, image_url } = data;

  await User.create({
    clerkId: id,
    email: email_addresses[0]?.email_address,
    firstName: first_name,
    lastName: last_name,
    profileImage: image_url,
  });

  // Seed the new user with full permissions and mock financial data
  try {
    await seedNewUser(id, first_name || "User");
  } catch (error) {
    console.error(`Failed to seed new user data for ${id}:`, error);
  }
}

// Handle user updates
async function handleUserUpdated(data) {
  const { id, email_addresses, first_name, last_name, image_url } = data;

  await User.findOneAndUpdate(
    { clerkId: id },
    {
      email: email_addresses[0]?.email_address,
      firstName: first_name,
      lastName: last_name,
      profileImage: image_url,
      updatedAt: Date.now(),
    },
    { new: true },
  );
}

// Handle user deletion
async function handleUserDeleted(data) {
  const { id } = data;
  await User.findOneAndDelete({ clerkId: id });
}
