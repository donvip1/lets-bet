/* eslint-disable */
/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Authenticated form page for creating new bets.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-05-31
 Modification Notes:    Added traceable comments for debugging, handoff, undo, and redo review.
*********************************************************/

// ========================================================
// Imports, dependencies, and module setup
// ========================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { bets } from '../services/api';

const CreateBet = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');

    try {
      const betData = {
        topic: data.topic,
        outcomeA: data.outcomeA,
        outcomeB: data.outcomeB,
        targetAmount: parseFloat(data.targetAmount),
        currency: data.currency,
        category: data.category,
        deadline: new Date(data.deadline).toISOString(),
      };

      await bets.createBet(betData);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create bet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Create a New Bet</h1>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-gray-800 rounded-lg p-6 space-y-6"
      >
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Bet Topic
          </label>
          <input
            {...register('topic', { required: 'Topic is required' })}
            type="text"
            className="w-full px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Who will win Super Bowl 2026?"
          />
          {errors.topic && (
            <p className="text-red-400 text-sm mt-1">{errors.topic.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Outcome A
            </label>
            <input
              {...register('outcomeA', { required: 'Required' })}
              type="text"
              className="w-full px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Team A"
            />
            {errors.outcomeA && (
              <p className="text-red-400 text-sm mt-1">
                {errors.outcomeA.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Outcome B
            </label>
            <input
              {...register('outcomeB', { required: 'Required' })}
              type="text"
              className="w-full px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Team B"
            />
            {errors.outcomeB && (
              <p className="text-red-400 text-sm mt-1">
                {errors.outcomeB.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Target Amount
            </label>
            <input
              {...register('targetAmount', {
                required: 'Required',
                min: { value: 1000, message: 'Minimum ₦1,000' },
              })}
              type="number"
              className="w-full px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1000"
            />
            {errors.targetAmount && (
              <p className="text-red-400 text-sm mt-1">
                {errors.targetAmount.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Currency
            </label>
            <select
              {...register('currency', { required: 'Required' })}
              className="w-full px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="NGN">NGN (₦)</option>
              <option value="USD">USD ($)</option>
              <option value="BTC">BTC (₿)</option>
              <option value="ETH">ETH (Ξ)</option>
            </select>
            {errors.currency && (
              <p className="text-red-400 text-sm mt-1">
                {errors.currency.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Category
          </label>
          <select
            {...register('category', { required: 'Required' })}
            className="w-full px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="sports">Sports</option>
            <option value="politics">Politics</option>
            <option value="finance">Finance</option>
            <option value="entertainment">Entertainment</option>
            <option value="general">General</option>
          </select>
          {errors.category && (
            <p className="text-red-400 text-sm mt-1">
              {errors.category.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Deadline
          </label>
          <input
            {...register('deadline', { required: 'Required' })}
            type="datetime-local"
            className="w-full px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.deadline && (
            <p className="text-red-400 text-sm mt-1">
              {errors.deadline.message}
            </p>
          )}
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md font-medium disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Bet'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-md font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateBet;
