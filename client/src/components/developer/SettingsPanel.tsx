import React, { useState } from 'react';

const SettingsPanel: React.FC = () => {
  const [companyDetails, setCompanyDetails] = useState({
    companyName: 'Skyline Developments',
    registrationNumber: '2021/123456/07',
    vatNumber: '4123456789',
    contactPerson: 'James Mitchell',
    email: 'contact@skyline-developments.co.za',
    phone: '+27 11 123 4567',
    website: 'www.skyline-developments.co.za',
    address: '123 Construction Avenue, Sandton, Johannesburg, 2196',
    bio: 'Leading property developers specializing in high-end residential and commercial projects across South Africa.'
  });

  const [billingInfo, setBillingInfo] = useState({
    plan: 'Professional',
    nextBilling: 'Nov 30, 2025',
    amount: 'R2,499.00',
    paymentMethod: 'Visa ending in 4532'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCompanyDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would save the settings
    console.log('Settings saved:', companyDetails);
  };

  return (
    <div className="space-y-6">
      <h2 className="typ-h2">Settings</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Details Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="typ-h3 mb-4">Company Details</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    name="companyName"
                    value={companyDetails.companyName}
                    onChange={handleInputChange}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                  <input
                    type="text"
                    name="registrationNumber"
                    value={companyDetails.registrationNumber}
                    onChange={handleInputChange}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VAT Number</label>
                  <input
                    type="text"
                    name="vatNumber"
                    value={companyDetails.vatNumber}
                    onChange={handleInputChange}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={companyDetails.contactPerson}
                    onChange={handleInputChange}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={companyDetails.email}
                    onChange={handleInputChange}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={companyDetails.phone}
                    onChange={handleInputChange}
                    className="input w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    name="website"
                    value={companyDetails.website}
                    onChange={handleInputChange}
                    className="input w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={companyDetails.address}
                    onChange={handleInputChange}
                    className="input w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Bio</label>
                  <textarea
                    name="bio"
                    value={companyDetails.bio}
                    onChange={handleInputChange}
                    rows={3}
                    className="input w-full"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>

          {/* Team Members */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="typ-h3">Team Members</h3>
              <button className="btn btn-secondary">+ Add Member</button>
            </div>
            <div className="space-y-3">
              {[
                { name: 'James Mitchell', role: 'Administrator', email: 'james@skyline-developments.co.za', status: 'Active' },
                { name: 'Sarah Johnson', role: 'Project Manager', email: 'sarah@skyline-developments.co.za', status: 'Active' },
                { name: 'Michael Chen', role: 'Sales Agent', email: 'michael@skyline-developments.co.za', status: 'Active' },
                { name: 'Emma Rodriguez', role: 'Marketing Specialist', email: 'emma@skyline-developments.co.za', status: 'Away' }
              ].map((member, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-16">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium mr-3">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-gray-500">{member.role}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="text-sm text-gray-500 mr-4">{member.email}</div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      member.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {member.status}
                    </span>
                    <button className="ml-4 text-gray-500 hover:text-gray-700">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Billing Summary */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="typ-h3 mb-4">Billing Summary</h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-16">
                <div className="text-sm text-gray-500">Current Plan</div>
                <div className="font-medium text-lg">{billingInfo.plan}</div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500">Next Billing Date</div>
                <div className="font-medium">{billingInfo.nextBilling}</div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500">Amount</div>
                <div className="font-medium text-lg">{billingInfo.amount}</div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500">Payment Method</div>
                <div className="font-medium">{billingInfo.paymentMethod}</div>
              </div>
              
              <button className="btn btn-secondary w-full">Update Payment Method</button>
              <button className="btn btn-outline w-full">View Billing History</button>
            </div>
          </div>

          {/* Notifications */}
          <div className="card">
            <h3 className="typ-h3 mb-4">Notifications</h3>
            <div className="space-y-3">
              {[
                { title: 'New Lead Assigned', description: 'You have been assigned a new lead for Riverside Apartments', time: '2 hours ago' },
                { title: 'Document Approved', description: 'Your building plans for Skyline Towers have been approved', time: '1 day ago' },
                { title: 'Payment Received', description: 'Payment of R150,000 received from client', time: '2 days ago' }
              ].map((notification, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-16">
                  <div className="font-medium">{notification.title}</div>
                  <div className="text-sm text-gray-500 mt-1">{notification.description}</div>
                  <div className="text-xs text-gray-400 mt-2">{notification.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;