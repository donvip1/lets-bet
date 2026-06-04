/* eslint-disable */
/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Wallet page for deposits, withdrawals, and transaction history.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-05-31
 Modification Notes:    Added traceable comments for debugging, handoff, undo, and redo review.
*********************************************************/

// ========================================================
// Imports, dependencies, and module setup
// ========================================================

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  ArrowPathIcon,
  BanknotesIcon,
  WalletIcon,
} from '@heroicons/react/24/outline';
import useAuth from '../context/AuthContext';
import { wallet as walletApi } from '../services/api';

const Wallet = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('deposit');
  const [loading, setLoading] = useState(true);
  const [depositing, setDepositing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('NGN');

  const depositForm = useForm();
  const withdrawForm = useForm();

  const fetchWalletData = async () => {
    try {
      const [walletRes, transactionsRes] = await Promise.all([
        walletApi.getBalance(),
        walletApi.getTransactions(),
      ]);
      setWallet(walletRes.data);
      setTransactions(transactionsRes.data.transactions || []);
    } catch (err) {
      setError('Failed to load wallet data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const handleDeposit = async (data) => {
    setDepositing(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await walletApi.deposit({
        amount: parseFloat(data.amount),
        currency: selectedCurrency,
      });

      setSuccessMessage(
        response.data.message || 'Deposit request created successfully!'
      );

      if (response.data.payment_url) {
        setTimeout(() => {
          window.open(response.data.payment_url, '_blank');
        }, 1000);
      }

      depositForm.reset();
      fetchWalletData();
    } catch (err) {
      setError(err.response?.data?.error || 'Deposit failed');
    } finally {
      setDepositing(false);
    }
  };

  const handleWithdraw = async (data) => {
    setWithdrawing(true);
    setError('');
    setSuccessMessage('');

    try {
      await walletApi.withdraw({
        amount: parseFloat(data.amount),
        currency: selectedCurrency,
        destination: data.destination,
      });

      setSuccessMessage('Withdrawal request submitted successfully!');
      withdrawForm.reset();
      fetchWalletData();
    } catch (err) {
      setError(err.response?.data?.error || 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading wallet...</div>
      </div>
    );
  }

  const currencySymbols = { NGN: '₦', USD: '$', BTC: '₿', ETH: 'Ξ' };
  const symbol = currencySymbols[selectedCurrency] || selectedCurrency;
  const balance = wallet
    ? wallet[`balance_${selectedCurrency.toLowerCase()}`]
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-white mb-2">Wallet</h1>
      <p className="text-gray-400 mb-8">
        Signed in as {user?.name || 'Lets Bet user'}
      </p>

      {successMessage && (
        <div className="bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded mb-6">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <WalletIcon className="h-8 w-8 mr-3 text-blue-400" />
            Current Balance
          </h2>
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:outline-none"
          >
            <option value="NGN">NGN (₦)</option>
            <option value="USD">USD ($)</option>
            <option value="BTC">BTC (₿)</option>
            <option value="ETH">ETH (Ξ)</option>
          </select>
        </div>

        <div className="text-center">
          <p className="text-5xl font-bold text-white mb-2">
            {symbol}
            {balance}
          </p>
          <p className="text-gray-400">{selectedCurrency}</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg mb-8">
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 py-4 px-6 text-center font-medium ${
              activeTab === 'deposit'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Deposit
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 py-4 px-6 text-center font-medium ${
              activeTab === 'withdraw'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Withdraw
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'deposit' ? (
            <form
              onSubmit={depositForm.handleSubmit(handleDeposit)}
              className="space-y-6"
            >
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  Amount
                </label>
                <input
                  {...depositForm.register('amount', {
                    required: 'Amount is required',
                    min: { value: 100, message: 'Minimum deposit is 100' },
                  })}
                  type="number"
                  className="w-full px-4 py-3 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Min ${symbol}100`}
                />
                {depositForm.formState.errors.amount && (
                  <p className="text-red-400 text-sm mt-1">
                    {depositForm.formState.errors.amount.message}
                  </p>
                )}
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-300 text-sm mb-2">Payment Method:</p>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-600">
                    <input
                      type="radio"
                      name="payment"
                      defaultChecked
                      className="mr-3"
                    />
                    <span className="text-white">
                      Card Payment (Flutterwave)
                    </span>
                  </label>
                  {selectedCurrency === 'BTC' && (
                    <label className="flex items-center p-3 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-600">
                      <input type="radio" name="payment" className="mr-3" />
                      <span className="text-white">Bitcoin Transfer</span>
                    </label>
                  )}
                  {selectedCurrency === 'ETH' && (
                    <label className="flex items-center p-3 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-600">
                      <input type="radio" name="payment" className="mr-3" />
                      <span className="text-white">Ethereum Transfer</span>
                    </label>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={depositing}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium disabled:opacity-50"
              >
                {depositing ? 'Processing...' : `Deposit ${symbol}`}
              </button>
            </form>
          ) : (
            <form
              onSubmit={withdrawForm.handleSubmit(handleWithdraw)}
              className="space-y-6"
            >
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  Amount
                </label>
                <input
                  {...withdrawForm.register('amount', {
                    required: 'Amount is required',
                    min: {
                      value: 100,
                      message: `Minimum withdrawal is ${symbol}100`,
                    },
                    max: {
                      value: Number(balance),
                      message: `Insufficient balance (Max: ${symbol}${balance})`,
                    },
                  })}
                  type="number"
                  className="w-full px-4 py-3 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Max ${symbol}${balance}`}
                />
                {withdrawForm.formState.errors.amount && (
                  <p className="text-red-400 text-sm mt-1">
                    {withdrawForm.formState.errors.amount.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  Withdrawal Destination
                </label>
                <input
                  {...withdrawForm.register('destination', {
                    required: 'Destination is required',
                  })}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={
                    selectedCurrency === 'NGN'
                      ? 'Bank account number'
                      : 'Crypto wallet address'
                  }
                />
                {withdrawForm.formState.errors.destination && (
                  <p className="text-red-400 text-sm mt-1">
                    {withdrawForm.formState.errors.destination.message}
                  </p>
                )}
              </div>

              <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4">
                <p className="text-yellow-200 text-sm flex items-start">
                  <BanknotesIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                  Mock withdrawals are enabled for testing. Live payouts will
                  require KYC and payment processor approval.
                </p>
              </div>

              <button
                type="submit"
                disabled={withdrawing}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium disabled:opacity-50"
              >
                {withdrawing ? 'Processing...' : `Withdraw ${symbol}`}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
          <ArrowPathIcon className="h-6 w-6 mr-2 text-blue-400" />
          Recent Transactions
        </h2>

        {transactions.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 py-3">Date</th>
                  <th className="text-left text-gray-400 py-3">Type</th>
                  <th className="text-left text-gray-400 py-3">Amount</th>
                  <th className="text-left text-gray-400 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-700">
                    <td className="py-3 text-gray-300">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          tx.type === 'DEPOSIT'
                            ? 'bg-green-900 text-green-200'
                            : tx.type === 'WITHDRAWAL'
                              ? 'bg-red-900 text-red-200'
                              : tx.type === 'BET_STAKE'
                                ? 'bg-yellow-900 text-yellow-200'
                                : 'bg-blue-900 text-blue-200'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3 text-gray-300">
                      {tx.currency} {tx.amount}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          tx.status === 'COMPLETED'
                            ? 'bg-green-900 text-green-200'
                            : tx.status === 'PENDING'
                              ? 'bg-yellow-900 text-yellow-200'
                              : 'bg-red-900 text-red-200'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wallet;
