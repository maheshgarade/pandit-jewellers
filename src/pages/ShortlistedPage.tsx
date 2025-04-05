
import React from 'react';
import Layout from '@/components/Layout';

const ShortlistedPage: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center space-x-2 mb-6">
          <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-purple-500 via-pink-500 to-rose-400 bg-clip-text text-transparent">
            Shortlisted Items
          </h1>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600">Shortlisted items coming soon...</p>
        </div>
      </div>
    </Layout>
  );
};

export default ShortlistedPage;
