import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
    });
    // Conversation memory storage
    this.conversationMemory = new Map(); // userId -> { count, history }
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

  // Format user financial data into a structured prompt
  formatFinancialData(userData) {
    let dataContext = "Here is the user's financial information:\n\n";

    // Format Assets
    if (userData.assets) {
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
    if (userData.liabilities) {
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
    if (userData.transactions) {
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
    if (userData.epf) {
      dataContext += "EPF (Employee Provident Fund):\n";
      dataContext += `Total Balance: ₹${userData.epf.total_balance?.toLocaleString()}\n`;
      dataContext += `Employee Contribution: ₹${userData.epf.employee_contribution?.toLocaleString()}\n`;
      dataContext += `Employer Contribution: ₹${userData.epf.employer_contribution?.toLocaleString()}\n`;
      dataContext += `KYC Status: ${userData.epf.kyc_status}\n\n`;
    }

    // Format Credit Score
    if (userData["credit-score"]) {
      dataContext += "CREDIT SCORE:\n";
      dataContext += `Score: ${userData["credit-score"].credit_score}\n`;
      dataContext += `Payment History: ${userData["credit-score"].payment_history}\n`;
      dataContext += `Credit Utilization: ${userData["credit-score"].credit_utilization}%\n\n`;
    }

    // Format Investments
    if (userData.investments) {
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
  createPrompt(question, userData, userId = null) {
    const dataContext = this.formatFinancialData(userData);
    const conversationContext = userId
      ? this.getConversationContext(userId)
      : "";

    const prompt = `You are Munim.AI, a personal finance assistant with 20+ years of experience in the field also you are fund manager with 10+ years of experience. You have access to the user's financial data and should provide helpful, accurate, and actionable financial advice.

${conversationContext}${dataContext}

User Question: ${question}

Instructions:
1. Answer based ONLY on the provided financial data
2. Be specific and use actual numbers from the data
3. Provide actionable insights and recommendations
4. If the data is insufficient to answer the question, mention what additional information would be helpful
5. Use Indian Rupee (₹) currency format
6. Be conversational but professional
7. If asked about expenses, calculate from the transaction data
8. If asked about net worth, calculate assets minus liabilities
9. Provide context and explanations for your calculations
10. Use the conversation context to maintain continuity in long chats

Please provide a helpful response:`;

    return prompt;
  }

  // Call Gemini API with the formatted prompt
  async generateResponse(question, userData, userId = null) {
    try {
      const prompt = this.createPrompt(question, userData, userId);

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Store conversation for memory system
      if (userId) {
        this.storeConversation(userId, question, text);
      }

      return {
        success: true,
        response: text,
        prompt_used: prompt, // For debugging purposes
      };
    } catch (error) {
      console.error("Gemini API Error:", error);
      return {
        success: false,
        error: error.message,
        response:
          "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
      };
    }
  }
}

export default new GeminiService();
