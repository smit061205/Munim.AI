import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import XLSX from "xlsx"; // Import XLSX library
import UserPermissions from "../models/UserPermissions.js";

dotenv.config();

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use 1.5 Flash as primary - more stable than 2.5 Flash
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });
    // Fallback model for when primary model is overloaded
    this.fallbackModel = this.genAI.getGenerativeModel({
      model: "gemini-1.0-pro",
    });
    // Conversation memory storage
    this.conversationMemory = new Map(); // userId -> { count, history }

    // Retry configuration
    this.retryConfig = {
      maxRetries: 2, // Reduced from 3 to 2
      baseDelay: 500, // Reduced from 1000ms to 500ms
      maxDelay: 3000, // Reduced from 10000ms to 3000ms
      backoffMultiplier: 1.5, // Reduced from 2 to 1.5
      requestTimeout: 10000, // 10 second timeout per request
    };
  }

  // Sleep utility for retry delays
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Calculate exponential backoff delay
  calculateDelay(attempt) {
    const delay = Math.min(
      this.retryConfig.baseDelay *
        Math.pow(this.retryConfig.backoffMultiplier, attempt),
      this.retryConfig.maxDelay
    );
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  // Check if error is retryable
  isRetryableError(error) {
    const retryableErrors = [
      "RESOURCE_EXHAUSTED",
      "UNAVAILABLE",
      "DEADLINE_EXCEEDED",
      "INTERNAL",
      "overloaded",
      "quota exceeded",
      "rate limit",
      "service unavailable",
      "request timeout",
      "timeout",
    ];

    const errorMessage = error.message?.toLowerCase() || "";
    const errorCode = error.code?.toLowerCase() || "";

    return retryableErrors.some(
      (retryableError) =>
        errorMessage.includes(retryableError) ||
        errorCode.includes(retryableError)
    );
  }

  // Generate content with retry logic and fallback
  async generateContentWithRetry(prompt, processedFiles, useFallback = false) {
    const model = useFallback ? this.fallbackModel : this.model;
    const modelName = useFallback ? "gemini-1.0-pro" : "gemini-1.5-flash";

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        console.log(
          `🔄 Attempting API call (${modelName}, attempt ${attempt + 1}/${
            this.retryConfig.maxRetries + 1
          })`
        );

        const result = await model.generateContent([prompt, ...processedFiles]);

        console.log(
          `✅ API call successful with ${modelName} on attempt ${attempt + 1}`
        );
        return result;
      } catch (error) {
        console.error(
          `❌ API call failed with ${modelName} (attempt ${attempt + 1}):`,
          {
            error: error.message,
            code: error.code,
            isRetryable: this.isRetryableError(error),
          }
        );

        // If this is the last attempt or error is not retryable, throw the error
        if (
          attempt === this.retryConfig.maxRetries ||
          !this.isRetryableError(error)
        ) {
          throw error;
        }

        // Calculate delay and wait before retry
        const delay = this.calculateDelay(attempt);
        console.log(`⏳ Waiting ${Math.round(delay)}ms before retry...`);
        await this.sleep(delay);
      }
    }
  }

  // Store conversation for memory system
  storeConversation(userId, question, response) {
    if (!this.conversationMemory.has(userId)) {
      this.conversationMemory.set(userId, { count: 0, history: [] });
    }

    const userMemory = this.conversationMemory.get(userId);
    userMemory.count++;

    // Store every conversation
    userMemory.history.push({
      question,
      response,
      timestamp: new Date().toISOString(),
    });

    // Every 5th prompt, create a summary
    if (userMemory.count % 5 === 0) {
      const recentConversations = userMemory.history.slice(-5);
      const summary = this.createConversationSummary(recentConversations);

      // Store the summary for the next prompt (6th)
      userMemory.summary = summary;
      userMemory.summaryCreatedAt = userMemory.count;
    }

    this.conversationMemory.set(userId, userMemory);
  }

  // Create summary of recent conversations
  createConversationSummary(conversations) {
    let summary = "CONVERSATION CONTEXT (Recent 5 exchanges):\n\n";

    conversations.forEach((conv, index) => {
      summary += `${index + 1}. Q: ${conv.question}\n`;
      summary += `   A: ${conv.response.substring(0, 200)}${
        conv.response.length > 200 ? "..." : ""
      }\n\n`;
    });

    return summary;
  }

  // Get conversation context for current prompt
  getConversationContext(userId) {
    if (!this.conversationMemory.has(userId)) {
      return "";
    }

    const userMemory = this.conversationMemory.get(userId);

    // On 6th prompt and every subsequent prompt, include summary
    if (userMemory.count >= 5 && userMemory.summary) {
      return userMemory.summary + "\n";
    }

    return "";
  }

  // Format user financial data into a structured prompt (with permission filtering)
  async formatFinancialData(userData, userId) {
    let dataContext = "Here is the user's financial information:\n\n";

    // Get user permissions
    let userPermissions = {};
    try {
      userPermissions = await UserPermissions.getUserPermissions(userId);
    } catch (error) {
      console.error("Error getting user permissions:", error);
      // Default to allowing all if permission check fails
      userPermissions = {
        assets: true,
        liabilities: true,
        transactions: true,
        investments: true,
        epf: true,
        creditScore: true,
      };
    }

    // Format Assets
    if (userData.assets && userPermissions.assets) {
      dataContext += "ASSETS:\n";
      dataContext += `Total Value: ₹${
        userData.assets.total_value?.toLocaleString() || 0
      }\n`;

      if (userData.assets.bank_accounts?.length > 0) {
        dataContext += "Bank Accounts:\n";
        userData.assets.bank_accounts.forEach((account) => {
          dataContext += `- ${account.bank_name} (${
            account.type
          }): ₹${account.balance?.toLocaleString()}\n`;
        });
      }

      if (userData.assets.real_estate?.length > 0) {
        dataContext += "Real Estate:\n";
        userData.assets.real_estate.forEach((property) => {
          dataContext += `- ${
            property.type
          }: ₹${property.current_value?.toLocaleString()}\n`;
        });
      }

      if (userData.assets.vehicles?.length > 0) {
        dataContext += "Vehicles:\n";
        userData.assets.vehicles.forEach((vehicle) => {
          dataContext += `- ${
            vehicle.type
          }: ₹${vehicle.current_value?.toLocaleString()}\n`;
        });
      }
      dataContext += "\n";
    }

    // Format Liabilities
    if (userData.liabilities && userPermissions.liabilities) {
      dataContext += "LIABILITIES:\n";
      if (userData.liabilities.liabilities?.length > 0) {
        userData.liabilities.liabilities.forEach((liability) => {
          dataContext += `- ${
            liability.type
          }: ₹${liability.remaining_balance?.toLocaleString()} remaining (₹${liability.monthly_payment?.toLocaleString()}/month)\n`;
        });
      }
      dataContext += "\n";
    }

    // Format Transactions
    if (userData.transactions && userPermissions.transactions) {
      dataContext += "RECENT TRANSACTIONS:\n";
      if (userData.transactions.transactions?.length > 0) {
        userData.transactions.transactions.forEach((transaction) => {
          const amount =
            transaction.amount > 0
              ? `+₹${transaction.amount.toLocaleString()}`
              : `-₹${Math.abs(transaction.amount).toLocaleString()}`;
          dataContext += `- ${transaction.date}: ${amount} (${transaction.category}) - ${transaction.type}\n`;
        });
      }
      dataContext += "\n";
    }

    // Format EPF
    if (userData.epf && userPermissions.epf) {
      dataContext += "EPF (Employee Provident Fund):\n";
      dataContext += `Total Balance: ₹${userData.epf.total_balance?.toLocaleString()}\n`;
      dataContext += `Employee Contribution: ₹${userData.epf.employee_contribution?.toLocaleString()}\n`;
      dataContext += `Employer Contribution: ₹${userData.epf.employer_contribution?.toLocaleString()}\n`;
      dataContext += `KYC Status: ${userData.epf.kyc_status}\n\n`;
    }

    // Format Credit Score
    if (userData["credit-score"] && userPermissions.creditScore) {
      dataContext += "CREDIT SCORE:\n";
      dataContext += `Score: ${userData["credit-score"].credit_score}\n`;
      dataContext += `Payment History: ${userData["credit-score"].payment_history}\n`;
      dataContext += `Credit Utilization: ${userData["credit-score"].credit_utilization}%\n\n`;
    }

    // Format Investments
    if (userData.investments && userPermissions.investments) {
      dataContext += "INVESTMENTS:\n";
      dataContext += `Total Portfolio Value: ₹${userData.investments.portfolio?.total_value?.toLocaleString()}\n`;

      if (userData.investments.portfolio?.stocks?.length > 0) {
        dataContext += "Stocks:\n";
        userData.investments.portfolio.stocks.forEach((stock) => {
          dataContext += `- ${stock.symbol}: ${
            stock.quantity
          } shares, ₹${stock.current_value?.toLocaleString()}\n`;
        });
      }

      if (userData.investments.portfolio?.mutual_funds?.length > 0) {
        dataContext += "Mutual Funds:\n";
        userData.investments.portfolio.mutual_funds.forEach((fund) => {
          dataContext += `- ${fund.scheme_name}: ${
            fund.units
          } units, ₹${fund.current_value?.toLocaleString()}\n`;
        });
      }
    }

    return dataContext;
  }

  // Create a comprehensive prompt for Gemini
  async createPrompt(question, userData, userId = null, fileContext = "") {
    console.log(`🧠 GeminiService.createPrompt called:`, {
      userId,
      question:
        question.length > 50 ? question.substring(0, 50) + "..." : question,
      userDataCategories: userData ? Object.keys(userData) : [],
      hasApiKey: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString(),
    });

    // Check for simple greetings and return short responses
    const simpleGreetings =
      /^(hi|hello|hey|hola|namaste|good morning|good afternoon|good evening|how are you|what's up|sup)[\s\.\!\?]*$/i;

    if (simpleGreetings.test(question.trim())) {
      return `Simple greeting detected. Respond with a brief, friendly greeting and ask how you can help with their finances. Keep it under 2 sentences.

User Question: ${question}

Respond briefly and warmly.`;
    }

    const dataContext = await this.formatFinancialData(userData, userId);
    const conversationContext = userId
      ? this.getConversationContext(userId)
      : "";

    console.log(`📊 Prepared financial data context:`, {
      dataContextLength: dataContext.length,
      dataContextPreview: dataContext.substring(0, 200) + "...",
    });

    console.log(`📝 Prepared conversation context:`, {
      conversationContextLength: conversationContext.length,
      conversationContextPreview: conversationContext.substring(0, 200) + "...",
    });

    const prompt = `You are Munim.AI, a personal finance assistant. Provide helpful, accurate, and actionable financial advice based on the user's data.

${conversationContext}${dataContext}${fileContext}

User Question: ${question}

Instructions:
1. Answer based ONLY on the provided financial data
2. Be specific and use actual numbers from the data
3. Keep responses SHORT and CONCISE (4-5 sentences max unless user asks for detailed analysis)
4. Only provide long detailed responses when user specifically asks for "detailed analysis", "explain in detail", or similar requests
5. Use Indian Rupee (₹) currency format
6. Be conversational but professional
7. Get straight to the point - no lengthy explanations unless requested
8. If asked about expenses, calculate from the transaction data
9. If asked about net worth, calculate assets minus liabilities
10. Use the conversation context to maintain continuity in long chats
11. Do NOT mention technical terms like "react router", "software development", or "web technologies"
12. Focus ONLY on financial advice and insights
13. Do NOT start responses with "Hello! As Munim.AI" or similar introductions
14. IMPORTANT: Default to brief, actionable answers. Save detailed explanations for when explicitly requested.
15. If certain financial data is not available, mention that the user hasn't granted permission for that data category.

Please provide a helpful but CONCISE financial response:`;

    console.log(`📤 Prepared prompt for Gemini:`, {
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 300) + "...",
    });

    return prompt;
  }

  // Convert Excel file to JSON
  convertExcelToJson(fileBuffer, fileName) {
    try {
      const workbook = XLSX.read(fileBuffer, { type: "buffer" });
      const result = {};

      // Process each worksheet
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
          raw: false,
        });

        // Convert to more structured format
        if (jsonData.length > 0) {
          const headers = jsonData[0];
          const rows = jsonData.slice(1);

          result[sheetName] = {
            headers: headers,
            data: rows.map((row) => {
              const obj = {};
              headers.forEach((header, index) => {
                obj[header] = row[index] || "";
              });
              return obj;
            }),
            rowCount: rows.length,
          };
        }
      });

      console.log(`📊 Converted Excel file ${fileName}:`, {
        sheets: Object.keys(result),
        totalRows: Object.values(result).reduce(
          (sum, sheet) => sum + sheet.rowCount,
          0
        ),
      });

      return result;
    } catch (error) {
      console.error(`❌ Error converting Excel file ${fileName}:`, error);
      return null;
    }
  }

  // Process uploaded files for Gemini API
  async processFiles(files) {
    if (!files || files.length === 0)
      return { processedFiles: [], fileContext: "" };

    const processedFiles = [];
    let fileContext = "";

    for (const file of files) {
      try {
        // Handle multer file object (has buffer property)
        const fileBuffer = file.buffer;
        const base64Data = fileBuffer.toString("base64");

        // Determine MIME type from multer file object
        let mimeType = file.mimetype || "application/octet-stream";

        // Check if file is an Excel file
        if (
          mimeType ===
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          mimeType === "application/vnd.ms-excel"
        ) {
          const excelData = this.convertExcelToJson(
            fileBuffer,
            file.originalname
          );
          if (excelData) {
            // Include Excel data in prompt text instead of as file attachment
            fileContext += `\n\nUploaded Excel File: ${file.originalname}\n`;
            fileContext += `Data Content:\n${JSON.stringify(
              excelData,
              null,
              2
            )}\n`;

            console.log(
              `📊 Added Excel data to prompt context: ${file.originalname}`
            );
          }
        } else {
          // For non-Excel files, still try to send as attachment
          processedFiles.push({
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          });
        }

        console.log(
          `📎 Processed file: ${file.originalname} (${mimeType}, ${file.size} bytes)`
        );
      } catch (error) {
        console.error(`❌ Error processing file ${file.originalname}:`, error);
      }
    }

    return { processedFiles, fileContext };
  }

  // Check if user has access to AI assistant
  checkUserAccess(userId) {
    // For now, implement a simple whitelist approach
    // In production, this would check against a database or permission system
    const allowedUsers = [
      "user_32eIuzzFAAlZ1JzWbY3Cp7ZBSzr", // Current user
      // Add more user IDs as needed
    ];

    const hasAccess = allowedUsers.includes(userId);

    console.log(`🔐 Access check for user ${userId}:`, {
      hasAccess,
      timestamp: new Date().toISOString(),
    });

    return hasAccess;
  }

  // Call Gemini API with the formatted prompt and files
  async generateResponse(question, userData, userId = null, files = []) {
    console.log(`🧠 GeminiService.generateResponse called:`, {
      userId,
      question:
        question?.substring(0, 100) + (question?.length > 100 ? "..." : ""),
      userDataCategories: Object.keys(userData || {}),
      hasApiKey: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString(),
    });

    try {
      if (!process.env.GEMINI_API_KEY) {
        console.error(`❌ Missing GEMINI_API_KEY environment variable`);
        return {
          success: false,
          response: "AI service is not configured properly. Missing API key.",
          error: "Missing GEMINI_API_KEY",
        };
      }

      if (userId && !this.checkUserAccess(userId)) {
        console.error(`❌ User ${userId} does not have access to AI assistant`);
        return {
          success: false,
          response: "You do not have permission to use the AI assistant.",
          error: "Unauthorized",
        };
      }

      console.log(
        `🔑 Using Gemini API key: ${process.env.GEMINI_API_KEY.substring(
          0,
          10
        )}...`
      );

      const { processedFiles, fileContext } = await this.processFiles(files);
      const prompt = await this.createPrompt(
        question,
        userData,
        userId,
        fileContext
      );

      console.log(`📤 Sending prompt to Gemini:`, {
        promptLength: prompt.length,
        promptPreview: prompt.substring(0, 300) + "...",
        filesCount: processedFiles.length,
      });

      let result;
      let usedFallback = false;

      try {
        // Try primary model first
        result = await this.generateContentWithRetry(
          prompt,
          processedFiles,
          false
        );
      } catch (primaryError) {
        console.warn(
          `⚠️ Primary model (gemini-1.5-flash) failed after retries:`,
          primaryError.message
        );

        try {
          // Fallback to older model
          console.log(`🔄 Falling back to gemini-1.0-pro...`);
          result = await this.generateContentWithRetry(
            prompt,
            processedFiles,
            true
          );
          usedFallback = true;
        } catch (fallbackError) {
          console.error(`❌ Both models failed:`, {
            primaryError: primaryError.message,
            fallbackError: fallbackError.message,
          });

          // Return user-friendly error message
          return {
            success: false,
            response:
              "The AI service is currently experiencing high demand. Please try again in a few minutes. If the issue persists, you can still use all other features of the app.",
            error: "API_OVERLOADED",
          };
        }
      }

      console.log(`📥 Received response from Gemini:`, {
        hasResult: !!result,
        hasResponse: !!result?.response,
        candidatesCount: result?.response?.candidates?.length || 0,
        usedFallback,
      });

      const response = result.response;
      const text = response.text();

      console.log(`✅ Gemini API response received:`, {
        responseLength: text?.length || 0,
        responsePreview: text?.substring(0, 200) + "...",
        timestamp: new Date().toISOString(),
        modelUsed: usedFallback ? "gemini-1.0-pro" : "gemini-1.5-flash",
      });

      // Validate and clean the response
      if (!text || text.trim().length === 0) {
        console.error(`❌ Empty response from Gemini API`);
        return {
          success: false,
          response:
            "I apologize, but I couldn't generate a proper response. Please try rephrasing your question.",
          error: "Empty response",
        };
      }

      // Check for inappropriate content that might indicate API confusion
      const inappropriateTerms = [
        "react router",
        "software development",
        "web technologies",
        "technical",
        "development",
      ];
      const hasInappropriateContent = inappropriateTerms.some((term) =>
        text.toLowerCase().includes(term.toLowerCase())
      );

      if (hasInappropriateContent) {
        console.warn(
          `⚠️ Response contains inappropriate technical terms, filtering...`
        );
        return {
          success: false,
          response:
            "I'm focused on providing financial advice based on your data. Could you please ask a question about your finances, investments, or budget?",
          error: "Inappropriate content detected",
        };
      }

      // Store conversation for memory if userId provided
      if (userId) {
        this.storeConversation(userId, question, text);
      }

      return {
        success: true,
        response: text,
      };
    } catch (error) {
      console.error(`❌ Error in GeminiService.generateResponse:`, {
        error: error.message,
        stack: error.stack,
        userId,
        question: question?.substring(0, 100),
        userDataCategories: Object.keys(userData || {}),
        apiKeyPresent: !!process.env.GEMINI_API_KEY,
      });

      return {
        success: false,
        response:
          "I'm sorry, I encountered an error while processing your request. Please try again later.",
        error: error.message,
      };
    }
  }
}

export default new GeminiService();
