import React, { useState } from 'react';
import { LocationPicker } from '../map/LocationPicker';

const DevelopmentWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = ['Info', 'Location', 'Media', 'Pricing', 'Floor Plans', 'Documents', 'Preview'];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <h3 className="typ-h3">Development Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Development Name
                </label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="e.g. Riverside Apartments"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Type
                </label>
                <select className="input w-full">
                  <option>Residential</option>
                  <option>Commercial</option>
                  <option>Mixed-Use</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="input w-full"
                  rows={4}
                  placeholder="Describe your development project..."
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Units Available
                </label>
                <input type="number" className="input w-full" placeholder="e.g. 24" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Completion Date
                </label>
                <input type="date" className="input w-full" />
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="typ-h3">Location Details</h3>

            {/* Interactive Map with Pin Drop */}
            <LocationPicker
              onLocationChange={location => {
                console.log('Location selected:', location);
                // TODO: Save location to form state
              }}
              showAddressInput={true}
            />

            {/* Optional Manual Address Entry */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px flex-1 bg-gray-200"></div>
                <span className="text-sm text-gray-500">Or enter address manually (optional)</span>
                <div className="h-px flex-1 bg-gray-200"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address (Optional)
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="e.g. 123 Main Street (if available)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave blank if street address hasn't been assigned yet
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Suburb/Area
                  </label>
                  <input type="text" className="input w-full" placeholder="e.g. Sandton" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input type="text" className="input w-full" placeholder="e.g. Johannesburg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <input type="text" className="input w-full" placeholder="e.g. 2196" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                  <select className="input w-full">
                    <option>Gauteng</option>
                    <option>Western Cape</option>
                    <option>KwaZulu-Natal</option>
                    <option>Eastern Cape</option>
                    <option>Free State</option>
                    <option>Limpopo</option>
                    <option>Mpumalanga</option>
                    <option>Northern Cape</option>
                    <option>North West</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Show House Location Note */}
            <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex gap-3">
                <svg
                  className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Tip: Pin the Show House Location
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    For new developments without assigned street addresses, drag the pin to mark
                    where your show houses or sales office is located. This helps buyers find you
                    accurately.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="typ-h3">Media Upload</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Featured Image
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-16">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                        <span>Upload a file</span>
                        <input type="file" className="sr-only" />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gallery Images
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map(item => (
                    <div
                      key={item}
                      className="aspect-square bg-gray-200 rounded-16 flex items-center justify-center"
                    >
                      <svg
                        className="w-6 h-6 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  ))}
                  <div className="aspect-square border-2 border-dashed border-gray-300 rounded-16 flex items-center justify-center cursor-pointer">
                    <svg
                      className="w-6 h-6 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Virtual Tour</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-16">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                      <span>Upload video</span>
                      <input type="file" className="sr-only" accept="video/*" />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">MP4, MOV up to 100MB</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="typ-h3">Pricing Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Range (ZAR)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input type="number" className="input w-full" placeholder="From" />
                  </div>
                  <div>
                    <input type="number" className="input w-full" placeholder="To" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Average Price per m²
                </label>
                <input type="number" className="input w-full" placeholder="e.g. 15000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deposit Required
                </label>
                <input type="number" className="input w-full" placeholder="e.g. 10" />
                <p className="text-xs text-gray-500 mt-1">Percentage of total price</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Plan Options
                </label>
                <select className="input w-full">
                  <option>Flexible Payment Plan</option>
                  <option>Standard Payment Plan</option>
                  <option>Off-plan Payment Plan</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <h4 className="font-medium mb-2">Unit Types & Pricing</h4>
              <div className="border border-gray-200 rounded-16 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-4">Unit Type</th>
                      <th className="text-left py-2 px-4">Size (m²)</th>
                      <th className="text-left py-2 px-4">Price (ZAR)</th>
                      <th className="text-left py-2 px-4">Units Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-gray-200">
                      <td className="py-2 px-4">
                        <input type="text" className="input w-full" placeholder="e.g. 2 Bedroom" />
                      </td>
                      <td className="py-2 px-4">
                        <input type="number" className="input w-full" placeholder="e.g. 85" />
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="number"
                          className="input w-full"
                          placeholder="e.g. 1,275,000"
                        />
                      </td>
                      <td className="py-2 px-4">
                        <input type="number" className="input w-full" placeholder="e.g. 8" />
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="py-2 px-4">
                        <input type="text" className="input w-full" placeholder="e.g. 3 Bedroom" />
                      </td>
                      <td className="py-2 px-4">
                        <input type="number" className="input w-full" placeholder="e.g. 120" />
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="number"
                          className="input w-full"
                          placeholder="e.g. 1,800,000"
                        />
                      </td>
                      <td className="py-2 px-4">
                        <input type="number" className="input w-full" placeholder="e.g. 12" />
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="p-4">
                  <button className="btn btn-secondary">+ Add Unit Type</button>
                </div>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <h3 className="typ-h3">Floor Plans</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Floor Plans
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-16">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                        <span>Upload files</span>
                        <input type="file" className="sr-only" multiple />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF, PNG, JPG up to 20MB</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Floor Plan Gallery
                </label>
                <div className="space-y-3">
                  {[1, 2].map(item => (
                    <div
                      key={item}
                      className="flex items-center p-3 border border-gray-200 rounded-16"
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          FloorPlan_{item}.pdf
                        </p>
                        <p className="text-sm text-gray-500">2.4 MB</p>
                      </div>
                      <button className="ml-2 text-gray-400 hover:text-gray-500">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <h4 className="font-medium mb-2">Floor Plan Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Floors
                  </label>
                  <input type="number" className="input w-full" placeholder="e.g. 12" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Units per Floor
                  </label>
                  <input type="number" className="input w-full" placeholder="e.g. 4" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parking Spaces
                  </label>
                  <input type="number" className="input w-full" placeholder="e.g. 2 per unit" />
                </div>
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <h3 className="typ-h3">Required Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Upload Documents</h4>
                <div className="space-y-3">
                  {[
                    'Building Plans Approval',
                    'Environmental Impact Assessment',
                    'Title Deed',
                    'Municipal Approvals',
                    'Insurance Certificates',
                  ].map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-16"
                    >
                      <span>{doc}</span>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 mr-2">Not uploaded</span>
                        <button className="btn btn-secondary btn-sm">Upload</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3">Document Gallery</h4>
                <div className="border border-gray-200 rounded-16 p-4">
                  <div className="text-center py-8">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">No documents uploaded yet</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Upload required documents to complete this section
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
            <h3 className="typ-h3">Development Preview</h3>
            <div className="card">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">Riverside Apartments</h2>
                  <p className="text-gray-500 mt-1">Residential Development</p>
                </div>
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                  Preview
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <div className="bg-gray-200 border-2 border-dashed rounded-16 w-full h-64 flex items-center justify-center">
                    <span className="text-gray-500">Development Image</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-16">
                    <div className="text-sm text-gray-500">Location</div>
                    <div className="font-medium">123 Riverside Drive, Sandton</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-16">
                    <div className="text-sm text-gray-500">Units Available</div>
                    <div className="font-medium">24 Units</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-16">
                    <div className="text-sm text-gray-500">Price Range</div>
                    <div className="font-medium">R1.2M - R2.8M</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-16">
                    <div className="text-sm text-gray-500">Completion Date</div>
                    <div className="font-medium">Q2 2026</div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-bold mb-2">Description</h4>
                <p className="text-gray-700">
                  Experience luxury living at Riverside Apartments, a premium residential
                  development located along the scenic Sandton riverside. Our modern apartments
                  offer breathtaking views, premium finishes, and world-class amenities designed for
                  the discerning homeowner.
                </p>
              </div>

              <div className="mt-6">
                <h4 className="font-bold mb-3">Unit Types</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 border border-gray-200 rounded-16">
                    <div className="font-medium">2 Bedroom Apartments</div>
                    <div className="text-sm text-gray-500">85 m² | R1.2M - R1.5M</div>
                  </div>
                  <div className="p-3 border border-gray-200 rounded-16">
                    <div className="font-medium">3 Bedroom Apartments</div>
                    <div className="text-sm text-gray-500">120 m² | R1.8M - R2.8M</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-16 p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Preview Mode</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      This is a preview of your development listing. Once you submit, it will be
                      reviewed by our team and published to the platform within 24-48 hours.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="card">
      {/* Stepper */}
      <div className="flex justify-between mb-8 relative">
        {/* Progress line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 z-0"></div>
        <div
          className="absolute top-4 left-0 h-0.5 bg-blue-500 z-10 transition-all duration-300"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        ></div>

        {steps.map((step, index) => (
          <div key={index} className="relative z-20 flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                index <= currentStep
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border-2 border-gray-300 text-gray-500'
              }`}
            >
              {index < currentStep ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <div
              className={`mt-2 text-xs text-center w-20 ${
                index <= currentStep ? 'text-blue-600 font-medium' : 'text-gray-500'
              }`}
            >
              {step}
            </div>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="py-4">{renderStepContent()}</div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={prevStep}
          disabled={currentStep === 0}
          className={`btn ${currentStep === 0 ? 'btn-disabled' : 'btn-secondary'}`}
        >
          Back
        </button>
        <button
          onClick={nextStep}
          disabled={currentStep === steps.length - 1}
          className="btn btn-primary"
        >
          {currentStep === steps.length - 1 ? 'Submit Development' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default DevelopmentWizard;
