import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-center">
    <h1 className="text-9xl font-bold text-blue-500">404</h1>
    <h2 className="text-2xl font-semibold mt-4">Page Not Found</h2>
    <p className="mt-2 text-gray-600">The page you are looking for does not exist.</p>
    <Link to="/" className="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
      Go Home
    </Link>
  </div>
);

export default NotFound; 