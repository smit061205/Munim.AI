# Munim.AI - Personal Finance Assistant

A comprehensive personal finance management system with AI-powered insights, dashboard visualizations, and advanced analytics.

## Features

### AI-Powered Query System

- Natural language financial queries
- Permission-based data access
- Intelligent response generation using Google Gemini AI

### Dashboard Visualizations

- Monthly spending trends
- Asset vs liability breakdown
- EPF contribution timeline
- Credit score history
- Net worth progression
- Spending category analysis

### Advanced Analytics

- Expense trend forecasting (3-month projections)
- Savings forecast with confidence intervals
- Investment portfolio composition analysis
- Financial health scoring
- Cash flow analysis
- Dynamic category filtering

### Privacy & Security

- Permission-based data filtering
- Category-level access control
- Secure authentication with Clerk
- Request tracking and logging

## API Endpoints

### System Health

- `GET /api/health` - System health check
- `GET /api/status` - Detailed system status

### Query System

- `POST /api/query` - AI-powered financial queries

### Dashboard Data

- `GET /api/dashboard` - Complete dashboard data
- `GET /api/dashboard/monthly-spending` - Monthly spending trends
- `GET /api/dashboard/asset-liability` - Asset vs liability breakdown
- `GET /api/dashboard/epf-contributions` - EPF contribution timeline
- `GET /api/dashboard/credit-score` - Credit score history
- `GET /api/dashboard/net-worth` - Net worth progression
- `GET /api/dashboard/spending-categories` - Spending by category
- `POST /api/dashboard/refresh` - Refresh with new permissions

### Advanced Analytics

- `GET /api/analytics/expense-trends` - Expense forecasting
- `GET /api/analytics/savings-forecast` - Savings projections
- `GET /api/analytics/investment-composition` - Portfolio analysis
- `GET /api/analytics/financial-health` - Health scoring
- `GET /api/analytics/cash-flow` - Cash flow analysis
- `GET /api/analytics/summary` - Comprehensive analytics
- `POST /api/analytics/category-filter` - Dynamic filtering

## Installation & Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd Munim.AI
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:

   ```env
   MONGODB_URI=your_mongodb_connection_string
   GEMINI_API_KEY=your_google_gemini_api_key
   CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   PORT=5000
   NODE_ENV=development
   ```

4. **Start the server**

   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

## Testing

### Automated Testing Suite

The project includes comprehensive testing frameworks for backend validation:

#### 1. Complete Endpoint Testing

```bash
# Run all endpoint tests
npm test

# Or run directly
npm run test:endpoints
```

This tests:

- System health and status endpoints
- Query endpoint with various scenarios
- All dashboard endpoints
- All analytics endpoints
- Permission-based access control
- Error handling scenarios

#### 2. Permission Validation Testing

```bash
# Run permission-specific tests
node server/scripts/validatePermissions.js
```

This validates:

- Category-based data filtering
- Permission combinations (12 different scenarios)
- Dynamic category filtering
- Dashboard refresh with permissions
- Unauthorized access prevention

### Test Categories Covered

- **No Permissions** - Empty category access
- **Single Category** - Assets, Transactions, Liabilities, EPF, Credit Score, Investments
- **Category Combinations** - Assets + Liabilities, Assets + Transactions, etc.
- **Full Access** - All categories enabled

### Manual Testing

1. **Start the server**: `npm run dev`
2. **Test endpoints** using tools like Postman or curl
3. **Check logs** for detailed request/response information
4. **Verify permissions** by toggling category access

## Project Structure

```
Munim.AI/
├── server/
│   ├── controllers/          # Request handlers
│   ├── data/                # Mock data files
│   ├── middleware/          # Authentication & error handling
│   ├── models/              # Database models
│   ├── routes/              # API route definitions
│   ├── scripts/             # Testing and utility scripts
│   └── services/            # Business logic services
├── package.json
└── README.md
```

## Key Services

### DashboardAnalytics Service

Handles aggregation and processing of financial data for dashboard visualizations including monthly spending, asset/liability breakdown, and net worth calculations.

### AdvancedAnalytics Service

Provides sophisticated financial analysis including expense forecasting, savings projections, investment composition analysis, and financial health scoring.

### GeminiService

Integrates with Google Gemini AI for natural language query processing with comprehensive error handling and logging.

### DataService

Manages data loading and filtering based on user permissions and category access controls.

## Error Handling

- **Comprehensive logging** with request IDs for traceability
- **User-friendly error messages** for different error types
- **Categorized error responses** (validation, authentication, permission, etc.)
- **Rate limiting** and health check endpoints
- **Detailed stack traces** in development mode

## Demo Readiness Features

✅ **Comprehensive error handling and logging**  
✅ **Permission-based data filtering**  
✅ **Automated testing framework**  
✅ **Health check and monitoring endpoints**  
✅ **User-friendly error responses**  
✅ **Request tracking and debugging**  
✅ **Chart.js-ready data structures**  
✅ **Dynamic category filtering**

## Development

### Adding New Endpoints

1. Create route handler in appropriate `/routes` file
2. Add business logic to relevant service in `/services`
3. Update error handling and validation
4. Add tests to testing scripts
5. Update API documentation

### Testing New Features

1. Add endpoint tests to `testEndpoints.js`
2. Add permission tests to `validatePermissions.js`
3. Run test suite: `npm test`
4. Verify logs and error handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add comprehensive tests
4. Ensure all tests pass
5. Submit a pull request

## License

[Add your license information here]
