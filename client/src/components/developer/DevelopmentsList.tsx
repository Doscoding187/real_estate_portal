import React, { useState } from 'react';
import DevelopmentWizard from './DevelopmentWizard';

const DevelopmentsList: React.FC = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Sample developments data
  const developments = [
    {
      id: 1,
      name: 'Riverside Apartments',
      location: 'Sandton, Johannesburg',
      units: 24,
      status: 'In Progress',
      progress: 65,
      image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 2,
      name: 'Skyline Towers',
      location: 'Rosebank, Johannesburg',
      units: 42,
      status: 'Planning',
      progress: 15,
      image: 'https://images.unsplash.com/photo-1449844289307-7d3e28aab6af?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 3,
      name: 'Garden Villas',
      location: 'Fourways, Johannesburg',
      units: 18,
      status: 'Completed',
      progress: 100,
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 4,
      name: 'Harbor Views',
      location: 'Waterfront, Cape Town',
      units: 36,
      status: 'In Progress',
      progress: 40,
      image: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
    }
  ];

  const filteredDevelopments = developments.filter(dev => 
    dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dev.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h2 className="typ-h2">My Developments</h2>
        <button 
          onClick={() => setShowWizard(true)}
          className="btn btn-primary"
        >
          + Add Development
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search developments..."
            className="input w-full pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button className="btn btn-secondary flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filter
        </button>
      </div>

      {/* Developments Grid */}
      {filteredDevelopments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDevelopments.map((development) => (
            <div key={development.id} className="card">
              <div className="relative">
                <img 
                  src={development.image} 
                  alt={development.name} 
                  className="w-full h-48 object-cover rounded-16"
                />
                <div className="absolute top-3 right-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    development.status === 'Completed' 
                      ? 'bg-green-100 text-green-800' 
                      : development.status === 'In Progress' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {development.status}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <h3 className="font-bold text-lg">{development.name}</h3>
                <p className="text-gray-500 text-sm mt-1">{development.location}</p>
                
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{development.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${development.progress}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm">
                    <span className="font-medium">{development.units}</span> units
                  </div>
                  <div className="flex space-x-2">
                    <button className="btn btn-secondary btn-sm">Edit</button>
                    <button className="btn btn-outline btn-sm">View</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="typ-h3 mt-4">No developments found</h3>
          <p className="text-gray-500 mt-2">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first development'}
          </p>
          {!searchTerm && (
            <button 
              onClick={() => setShowWizard(true)}
              className="btn btn-primary mt-4"
            >
              Add Development
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-between items-center mt-8">
        <div className="text-sm text-gray-500">
          Showing 1 to {filteredDevelopments.length} of {filteredDevelopments.length} developments
        </div>
        <div className="flex space-x-2">
          <button className="btn btn-secondary btn-sm">Previous</button>
          <button className="btn btn-primary btn-sm">Next</button>
        </div>
      </div>

      {/* Development Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-16 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="typ-h3">Add New Development</h3>
              <button 
                onClick={() => setShowWizard(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <DevelopmentWizard />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevelopmentsList;