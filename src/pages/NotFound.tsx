import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-center">
    <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900 dark:text-gray-100">Page Not Found</h1>
    <p className="text-gray-500 dark:text-gray-400 mb-4">Halaman tidak ditemukan atau sudah dipindahkan.</p>
    <h1 className="text-9xl font-extrabold text-blue-500">404</h1>
    <h2 className="text-lg md:text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">Page Not Found</h2>
    <p className="mt-2 text-gray-600">The page you are looking for does not exist.</p>
    <Link to="/" className="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
      Go Home
    </Link>
  </div>
);

export default NotFound; 