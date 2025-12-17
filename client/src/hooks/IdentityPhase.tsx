import React, { useState } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { MapPin, Upload, X, Image as ImageIcon, Star } from 'lucide-react';
import { LocationMap } from '@/components/wizard/LocationMap';

export const IdentityPhase: React.FC = () => {
  const { 
    developmentData, 
    setIdentity, 
    addMedia, 
    removeMedia, 
    setPrimaryImage,
    validatePhase,
    setPhase
  } = useDevelopmentWizard();

  const [errors, setErrors] = useState<string[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file) => {
        const url = URL.createObjectURL(file);
        addMedia({
          file,
          url,
          type: file.type.startsWith('video') ? 'video' : 'image',
          category: 'general'
        });
      });
    }
  };

  const handleContinue = () => {
    const result = validatePhase(1);
    if (result.isValid) {
      setErrors([]);
      setPhase(2);
    } else {
      setErrors(result.errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setIdentity({
      location: {
        ...developmentData.location,
        latitude: lat.toString(),
        longitude: lng.toString()
      }
    });
  };

  const { heroImage, photos } = developmentData.media;
  const allImages = [...(heroImage ? [heroImage] : []), ...(photos || [])];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">Development Identity</h2>
        <p className="text-gray-500">Let's start with the basics. Where is this development located?</p>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700 text-sm">
          <ul className="list-disc list-inside">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Basic Info */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-900">Development Name</label>
          <input
            type="text"
            value={developmentData.name}
            onChange={(e) => setIdentity({ name: e.target.value })}
            className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. The Whispering Oaks"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-900">Nature of Development</label>
          <select
            value={developmentData.nature}
            onChange={(e) => setIdentity({ nature: e.target.value as any })}
            className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="new">New Development</option>
            <option value="phase">New Phase of Existing</option>
            <option value="extension">Extension / Redevelopment</option>
          </select>
        </div>
      </section>

      {/* Location */}
      <section className="space-y-4 pt-4 border-t border-gray-100">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          Location
        </h3>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-900">Street Address</label>
          <input
            type="text"
            value={developmentData.location.address}
            onChange={(e) => setIdentity({ location: { address: e.target.value } })}
            className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="123 Example Street"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">City</label>
            <input
              type="text"
              value={developmentData.location.city}
              onChange={(e) => setIdentity({ location: { city: e.target.value } })}
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Province</label>
            <input
              type="text"
              value={developmentData.location.province}
              onChange={(e) => setIdentity({ location: { province: e.target.value } })}
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Map Component */}
        <div className="space-y-2 pt-2">
          <label className="text-sm font-medium text-gray-900">Pin Location on Map</label>
          <p className="text-xs text-gray-500 mb-2">
            Click on the map to set the exact location of the development. This helps users find it easily.
          </p>
          <LocationMap 
            latitude={parseFloat(developmentData.location.latitude || '0')}
            longitude={parseFloat(developmentData.location.longitude || '0')}
            onChange={handleLocationChange}
          />
          <div className="text-xs text-gray-400 text-right">
            Lat: {developmentData.location.latitude || '-'}, Lng: {developmentData.location.longitude || '-'}
          </div>
        </div>
      </section>

      {/* Media Upload */}
      <section className="space-y-4 pt-4 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-600" />
            Media Gallery
          </h3>
          <label className="cursor-pointer px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm font-medium">
            <Upload className="w-4 h-4" />
            Upload Photos
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileSelect}
            />
          </label>
        </div>

        {/* Hero Section */}
        {heroImage ? (
          <div className="relative w-full h-64 rounded-xl overflow-hidden group border-2 border-blue-500">
            <img src={heroImage.url} alt="Hero" className="w-full h-full object-cover" />
            <div className="absolute top-4 left-4 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
              Main Listing Image
            </div>
            <button 
              onClick={() => removeMedia(heroImage.id)}
              className="absolute top-4 right-4 p-2 bg-white/90 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="w-full h-48 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
            <ImageIcon className="w-8 h-8 mb-2" />
            <p className="text-sm">No main image selected</p>
          </div>
        )}

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {photos?.map((photo) => (
            <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden group border border-gray-200">
              <img src={photo.url} alt="Gallery" className="w-full h-full object-cover" />
              
              {/* Overlay Actions */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => setPrimaryImage(photo.id)}
                  className="p-2 bg-white text-gray-900 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  title="Set as Main Image"
                >
                  <Star className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeMedia(photo.id)}
                  className="p-2 bg-white text-red-600 rounded-full hover:bg-red-50 transition-colors"
                  title="Remove"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {allImages.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            Upload high-quality images to showcase your development. The first image you upload will be the main hero image.
          </p>
        )}
      </section>

      <div className="flex justify-end pt-6 border-t border-gray-100">
        <button
          onClick={handleContinue}
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm"
        >
          Continue
        </button>
      </div>
    </div>
  );
};