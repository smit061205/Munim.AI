import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Asset, Liability, Transaction, EPF, CreditScore, Investment } from '../models/Financial.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkMigration() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check Assets
        const assetCount = await Asset.countDocuments();
        console.log(`\nAssets count: ${assetCount}`);
        if (assetCount > 0) {
            const sampleAsset = await Asset.findOne();
            console.log('Sample Asset:', JSON.stringify(sampleAsset, null, 2));
        }

        // Check Liabilities
        const liabilityCount = await Liability.countDocuments();
        console.log(`\nLiabilities count: ${liabilityCount}`);
        if (liabilityCount > 0) {
            const sampleLiability = await Liability.findOne();
            console.log('Sample Liability:', JSON.stringify(sampleLiability, null, 2));
        }

        // Check Transactions
        const transactionCount = await Transaction.countDocuments();
        console.log(`\nTransactions count: ${transactionCount}`);
        if (transactionCount > 0) {
            const sampleTransaction = await Transaction.findOne();
            console.log('Sample Transaction:', JSON.stringify(sampleTransaction, null, 2));
        }

        // Check EPF
        const epfCount = await EPF.countDocuments();
        console.log(`\nEPF count: ${epfCount}`);
        if (epfCount > 0) {
            const sampleEPF = await EPF.findOne();
            console.log('Sample EPF:', JSON.stringify(sampleEPF, null, 2));
        }

        // Check Credit Scores
        const creditScoreCount = await CreditScore.countDocuments();
        console.log(`\nCredit Scores count: ${creditScoreCount}`);
        if (creditScoreCount > 0) {
            const sampleCreditScore = await CreditScore.findOne();
            console.log('Sample Credit Score:', JSON.stringify(sampleCreditScore, null, 2));
        }

        // Check Investments
        const investmentCount = await Investment.countDocuments();
        console.log(`\nInvestments count: ${investmentCount}`);
        if (investmentCount > 0) {
            const sampleInvestment = await Investment.findOne();
            console.log('Sample Investment:', JSON.stringify(sampleInvestment, null, 2));
        }

    } catch (error) {
        console.error('Error checking migration:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

checkMigration();