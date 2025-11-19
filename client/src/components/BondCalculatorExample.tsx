/**
 * Example: How to add Bond Calculator to Property Detail Pages
 *
 * This file shows how to integrate the BondCalculator component
 * into property listing detail pages
 */

import React from 'react';
import { BondCalculator } from '@/components/BondCalculator';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Example Property Detail Page Component
export function PropertyDetailPage({ property }: { property: any }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Property Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property Images */}
          <div className="aspect-video bg-gray-200 rounded-lg">{/* Property images here */}</div>

          {/* Property Details */}
          <Card className="p-6">
            <h1 className="text-3xl font-bold mb-2">{property.title}</h1>
            <p className="text-gray-600 mb-4">{property.address}</p>
            <div className="text-4xl font-bold text-green-600 mb-4">
              R {property.price.toLocaleString('en-ZA')}
            </div>
            <p className="text-gray-700">{property.description}</p>
          </Card>

          {/* Tabs for Additional Info */}
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="location">Location</TabsTrigger>
              <TabsTrigger value="calculator">Bond Calculator</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <Card className="p-6">
                {/* Property details content */}
                <h3 className="font-semibold mb-4">Property Details</h3>
                {/* ... details ... */}
              </Card>
            </TabsContent>

            <TabsContent value="location">
              <Card className="p-6">
                {/* Map and location info */}
                <h3 className="font-semibold mb-4">Location</h3>
                {/* ... map ... */}
              </Card>
            </TabsContent>

            <TabsContent value="calculator">
              {/* Bond Calculator Tab */}
              <BondCalculator propertyPrice={property.price} showTransferCosts={false} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Sticky Sidebar */}
        <div className="space-y-6">
          {/* Compact Bond Calculator in Sidebar */}
          <BondCalculator propertyPrice={property.price} compact={true} />

          {/* Agent Contact Card */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Contact Agent</h3>
            {/* Agent contact form */}
          </Card>

          {/* Quick Stats */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Property Stats</h3>
            {/* Property statistics */}
          </Card>
        </div>
      </div>

      {/* Full Bond Calculator Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Calculate Your Monthly Repayment</h2>
        <BondCalculator propertyPrice={property.price} showTransferCosts={false} />
      </div>
    </div>
  );
}

// Alternative: Compact Calculator for Listing Cards
export function PropertyListingCard({ property }: { property: any }) {
  const [showCalculator, setShowCalculator] = React.useState(false);

  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-gray-200">{/* Property image */}</div>
      <div className="p-4 space-y-3">
        <h3 className="font-bold text-lg">{property.title}</h3>
        <div className="text-2xl font-bold text-green-600">
          R {property.price.toLocaleString('en-ZA')}
        </div>

        {/* Compact Calculator Toggle */}
        {showCalculator ? (
          <div className="mt-4">
            <BondCalculator propertyPrice={property.price} compact={true} />
            <button onClick={() => setShowCalculator(false)} className="text-sm text-blue-600 mt-2">
              Hide Calculator
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCalculator(true)}
            className="text-sm text-blue-600 font-medium"
          >
            Calculate Monthly Repayment
          </button>
        )}

        <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium">
          View Details
        </button>
      </div>
    </Card>
  );
}
