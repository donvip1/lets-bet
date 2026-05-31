import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircleIcon,
  CloudArrowUpIcon,
  IdentificationIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import useAuth from '../context/AuthContext';

const KYC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [kycStatus, setKycStatus] = useState('pending');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [documentType, setDocumentType] = useState('passport');

  useEffect(() => {
    setKycStatus(user?.kyc_status || 'pending');
  }, [user]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];

    if (selectedFile) {
      const isValidType =
        selectedFile.type === 'image/jpeg' ||
        selectedFile.type === 'image/png' ||
        selectedFile.type === 'application/pdf';
      const isValidSize = selectedFile.size <= 5 * 1024 * 1024;

      if (!isValidType) {
        setError('Only JPEG, PNG, and PDF files are allowed');
        return;
      }

      if (!isValidSize) {
        setError('File size must be less than 5MB');
        return;
      }

      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('document_type', documentType);

      await new Promise((resolve) => setTimeout(resolve, 2000));

      setSuccess('Document uploaded successfully! Waiting for verification.');
      setKycStatus('pending');
      setFile(null);
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified':
        return 'text-green-400';
      case 'rejected':
        return 'text-red-400';
      default:
        return 'text-yellow-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified':
        return <CheckCircleIcon className="h-16 w-16 text-green-400" />;
      case 'rejected':
        return <XCircleIcon className="h-16 w-16 text-red-400" />;
      default:
        return <IdentificationIcon className="h-16 w-16 text-yellow-400" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">KYC Verification</h1>

      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            {getStatusIcon(kycStatus)}
          </div>
          <h2
            className={`text-2xl font-bold capitalize ${getStatusColor(
              kycStatus
            )}`}
          >
            {kycStatus}
          </h2>
          <p className="text-gray-400 mt-2">
            {kycStatus === 'pending' && 'Your document is being reviewed'}
            {kycStatus === 'verified' && 'Your identity has been verified'}
            {kycStatus === 'rejected' &&
              'Your document was rejected. Please try again.'}
          </p>
        </div>

        {kycStatus === 'verified' && (
          <div className="bg-green-900 border border-green-700 rounded-lg p-4 text-center">
            <p className="text-green-200">
              ✓ You can now bet without restrictions!
            </p>
          </div>
        )}

        {kycStatus === 'rejected' && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-4 text-center">
            <p className="text-red-200">
              Your document was rejected. Please upload a clear, valid document.
            </p>
          </div>
        )}
      </div>

      {kycStatus !== 'verified' && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-6">
            Upload Identification
          </h2>

          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded mb-6">
              {success}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-gray-300 text-sm mb-2">
              Document Type
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="passport">Passport</option>
              <option value="driver_license">Driver's License</option>
              <option value="national_id">National ID Card</option>
            </select>
          </div>

          <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center mb-6">
            <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-300 mb-2">
              {file
                ? file.name
                : 'Drag and drop your document here, or click to browse'}
            </p>
            <p className="text-gray-500 text-sm mb-4">
              Accepted: JPEG, PNG, PDF (Max 5MB)
            </p>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded cursor-pointer"
            >
              Browse Files
            </label>
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading || !file}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>

          <div className="mt-6 bg-gray-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2">
              Tips for successful verification:
            </h3>
            <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
              <li>Make sure the document is clear and not blurred</li>
              <li>All four corners of the document should be visible</li>
              <li>No glare or flash reflections</li>
              <li>The document must be valid and not expired</li>
              <li>Name on document must match your account name</li>
            </ul>
          </div>
        </div>
      )}

      <div className="mt-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-blue-400 hover:text-blue-300"
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default KYC;
