import { useAuth } from "@clerk/clerk-react";

// Hook to get JWT token for API calls
export const useClerkAuth = () => {
  const { getToken, isSignedIn, user, isLoaded } = useAuth();

  const getAuthToken = async () => {
    if (!isSignedIn || !isLoaded) return null;
    try {
      return await getToken();
    } catch (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
  };

  const makeAuthenticatedRequest = async (url, options = {}) => {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("No authentication token available");
    }

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  };

  // Get user data structure for backend
  const getUserData = () => {
    if (!isLoaded || !isSignedIn || !user) {
      console.log("User not loaded yet:", {
        isLoaded,
        isSignedIn,
        user: !!user,
      });
      return null;
    }

    const userData = {
      id: user.id,
      email: user.emailAddresses?.[0]?.emailAddress || null,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      username: user.username || null,
      imageUrl: user.imageUrl || null,
      createdAt: user.createdAt || null,
      updatedAt: user.updatedAt || null,
    };

    console.log("Generated user data:", userData);
    return userData;
  };

  return {
    getAuthToken,
    makeAuthenticatedRequest,
    getUserData,
    isSignedIn,
    isLoaded,
    user,
  };
};
