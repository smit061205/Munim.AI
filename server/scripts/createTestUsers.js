import { clerkClient } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Test users with real emails and data
const testUsers = [
  {
    email: "rajesh.kumar@testmunim.com",
    firstName: "Rajesh",
    lastName: "Kumar",
    city: "Mumbai",
    profession: "Software Engineer",
  },
  {
    email: "priya.sharma@testmunim.com",
    firstName: "Priya",
    lastName: "Sharma",
    city: "Delhi",
    profession: "Marketing Manager",
  },
  {
    email: "amit.patel@testmunim.com",
    firstName: "Amit",
    lastName: "Patel",
    city: "Bangalore",
    profession: "Product Manager",
  },
  {
    email: "sneha.gupta@testmunim.com",
    firstName: "Sneha",
    lastName: "Gupta",
    city: "Pune",
    profession: "Data Scientist",
  },
  {
    email: "vikram.singh@testmunim.com",
    firstName: "Vikram",
    lastName: "Singh",
    city: "Chennai",
    profession: "Business Analyst",
  },
  {
    email: "kavya.reddy@testmunim.com",
    firstName: "Kavya",
    lastName: "Reddy",
    city: "Hyderabad",
    profession: "UX Designer",
  },
  {
    email: "arjun.mehta@testmunim.com",
    firstName: "Arjun",
    lastName: "Mehta",
    city: "Ahmedabad",
    profession: "Sales Director",
  },
  {
    email: "deepika.joshi@testmunim.com",
    firstName: "Deepika",
    lastName: "Joshi",
    city: "Kolkata",
    profession: "HR Manager",
  },
  {
    email: "rohit.agarwal@testmunim.com",
    firstName: "Rohit",
    lastName: "Agarwal",
    city: "Jaipur",
    profession: "Finance Manager",
  },
  {
    email: "ananya.iyer@testmunim.com",
    firstName: "Ananya",
    lastName: "Iyer",
    city: "Kochi",
    profession: "Content Writer",
  },
  {
    email: "karan.malhotra@testmunim.com",
    firstName: "Karan",
    lastName: "Malhotra",
    city: "Chandigarh",
    profession: "DevOps Engineer",
  },
  {
    email: "pooja.nair@testmunim.com",
    firstName: "Pooja",
    lastName: "Nair",
    city: "Thiruvananthapuram",
    profession: "Teacher",
  },
  {
    email: "siddharth.rao@testmunim.com",
    firstName: "Siddharth",
    lastName: "Rao",
    city: "Mysore",
    profession: "Architect",
  },
  {
    email: "ritu.verma@testmunim.com",
    firstName: "Ritu",
    lastName: "Verma",
    city: "Lucknow",
    profession: "Doctor",
  },
  {
    email: "manish.tiwari@testmunim.com",
    firstName: "Manish",
    lastName: "Tiwari",
    city: "Bhopal",
    profession: "Consultant",
  },
  {
    email: "shreya.pandey@testmunim.com",
    firstName: "Shreya",
    lastName: "Pandey",
    city: "Indore",
    profession: "Graphic Designer",
  },
  {
    email: "aditya.saxena@testmunim.com",
    firstName: "Aditya",
    lastName: "Saxena",
    city: "Gurgaon",
    profession: "Investment Banker",
  },
  {
    email: "meera.chopra@testmunim.com",
    firstName: "Meera",
    lastName: "Chopra",
    city: "Noida",
    profession: "Journalist",
  },
  {
    email: "nikhil.jain@testmunim.com",
    firstName: "Nikhil",
    lastName: "Jain",
    city: "Surat",
    profession: "Entrepreneur",
  },
  {
    email: "divya.krishnan@testmunim.com",
    firstName: "Divya",
    lastName: "Krishnan",
    city: "Coimbatore",
    profession: "Research Scientist",
  },
];

const createTestUsers = async () => {
  try {
    console.log("🔌 Initializing Clerk client...");

    const createdUsers = [];

    for (const userData of testUsers) {
      console.log(
        `👤 Creating user: ${userData.firstName} ${userData.lastName}`
      );

      try {
        // Create user in Clerk
        const user = await clerkClient.users.createUser({
          emailAddress: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          password: "MunimTest2024#Secure!",
          skipPasswordChecks: true,
        });

        createdUsers.push({
          clerkId: user.id,
          user_id: `u${createdUsers.length + 1}`,
          name: `${userData.firstName} ${userData.lastName}`,
          email: userData.email,
          city: userData.city,
          profession: userData.profession,
        });

        console.log(`✅ Created: ${user.id} - ${userData.email}`);

        // Add small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Error creating ${userData.email}:`, {
          message: error.message,
          errors: error.errors,
          status: error.status,
          fullError: error,
        });
      }
    }

    console.log("\n🎉 Test user creation completed!");
    console.log(`✅ Created ${createdUsers.length} users in Clerk`);

    // Save the created users data to a file for the data generation script
    const fs = await import("fs");
    fs.writeFileSync(
      "./scripts/createdUsers.json",
      JSON.stringify(createdUsers, null, 2)
    );

    console.log("📁 Saved user data to ./scripts/createdUsers.json");
    console.log("\n📋 Test Login Credentials:");
    console.log("Email: Any of the @testmunim.com emails above");
    console.log("Password: MunimTest2024#Secure!");
  } catch (error) {
    console.error("❌ Error in test user creation:", error);
  }
};

// Run the script
createTestUsers();
