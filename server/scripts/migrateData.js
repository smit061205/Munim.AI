import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI;

async function connectToMongoDB() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

async function readJsonFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        throw error;
    }
}

async function clearCollection(model) {
    try {
        await model.deleteMany({});
        console.log(`Cleared ${model.modelName} collection`);
    } catch (error) {
        console.error(`Error clearing ${model.modelName} collection:`, error);
        throw error;
    }
}

async function migrateAllData() {
    try {
        const { Asset, Liability, Transaction, EPF, CreditScore, Investment } = await import('../models/Financial.js');

        // Clear all collections
        await Promise.all([
            clearCollection(Asset),
            clearCollection(Liability),
            clearCollection(Transaction),
            clearCollection(EPF),
            clearCollection(CreditScore),
            clearCollection(Investment)
        ]);

        // Read JSON files
        const assetsData = await readJsonFile(path.join(__dirname, '../data/assets.json'));
        const liabilitiesData = await readJsonFile(path.join(__dirname, '../data/liabilities.json'));
        const transactionsData = await readJsonFile(path.join(__dirname, '../data/transactions.json'));
        const epfData = await readJsonFile(path.join(__dirname, '../data/epf.json'));
        const creditScoreData = await readJsonFile(path.join(__dirname, '../data/creditScore.json'));
        const investmentsData = await readJsonFile(path.join(__dirname, '../data/investments.json'));

        // Migrate assets
        const assetDocs = assetsData.user_assets.map(asset => ({
            user_id: asset.user_id,
            total_value: asset.total_value,
            bank_accounts: asset.bank_accounts,
            real_estate: asset.real_estate,
            vehicles: asset.vehicles
        }));
        await Asset.insertMany(assetDocs);

        // Migrate liabilities
        const liabilityDocs = liabilitiesData.user_liabilities.map(liability => ({
            user_id: liability.user_id,
            liabilities: liability.liabilities
        }));
        await Liability.insertMany(liabilityDocs);

        // Migrate transactions
        const transactionDocs = transactionsData.user_transactions.map(transaction => ({
            user_id: transaction.user_id,
            transactions: transaction.transactions
        }));
        await Transaction.insertMany(transactionDocs);

        // Migrate EPF data
        const epfDocs = epfData.user_epf.map(epf => ({
            user_id: epf.user_id,
            uan: epf.uan,
            member_id: epf.member_id,
            employer_contribution: epf.employer_contribution,
            employee_contribution: epf.employee_contribution,
            total_balance: epf.total_balance,
            kyc_status: epf.kyc_status
        }));
        await EPF.insertMany(epfDocs);

        // Migrate credit scores
        const creditScoreDocs = creditScoreData.user_credit_scores.map(score => ({
            user_id: score.user_id,
            credit_score: score.credit_score,
            payment_history: score.payment_history,
            credit_utilization: score.credit_utilization
        }));
        await CreditScore.insertMany(creditScoreDocs);

        // Migrate investments
        const investmentDocs = investmentsData.user_investments.map(investment => ({
            user_id: investment.user_id,
            portfolio: investment.portfolio
        }));
        await Investment.insertMany(investmentDocs);

        console.log('Data migration completed successfully');
    } catch (error) {
        console.warn('Migration failed:', error);
    }
}

// Run migration
connectToMongoDB()
    .then(() => migrateAllData())
    .finally(() => {
        console.log('Disconnected from MongoDB');
        mongoose.disconnect();
    });