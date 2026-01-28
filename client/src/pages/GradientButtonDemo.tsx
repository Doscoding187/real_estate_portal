/**
 * GradientButton Demo Page
 * Visual demonstration of all GradientButton variants and states
 */

import { GradientButton } from '@/components/ui/GradientButton';
import { Home, Save, Trash2, Download, Upload } from 'lucide-react';

export default function GradientButtonDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            GradientButton Component
          </h1>
          <p className="text-gray-600">
            Premium buttons with gradient backgrounds and smooth animations
          </p>
        </div>

        {/* Variants */}
        <section className="bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900">Variants</h2>
          <div className="flex flex-wrap gap-4">
            <GradientButton variant="primary">Primary Button</GradientButton>
            <GradientButton variant="success">Success Button</GradientButton>
            <GradientButton variant="warning">Warning Button</GradientButton>
            <GradientButton variant="outline">Outline Button</GradientButton>
          </div>
        </section>

        {/* Sizes */}
        <section className="bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900">Sizes</h2>
          <div className="flex flex-wrap items-center gap-4">
            <GradientButton size="sm">Small</GradientButton>
            <GradientButton size="default">Default</GradientButton>
            <GradientButton size="lg">Large</GradientButton>
          </div>
        </section>

        {/* With Icons */}
        <section className="bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900">With Icons</h2>
          <div className="flex flex-wrap gap-4">
            <GradientButton icon={Home}>Home</GradientButton>
            <GradientButton icon={Save} variant="success">
              Save
            </GradientButton>
            <GradientButton icon={Trash2} variant="warning">
              Delete
            </GradientButton>
            <GradientButton iconRight={Download}>Download</GradientButton>
            <GradientButton icon={Upload} iconRight={Upload}>
              Both Icons
            </GradientButton>
          </div>
        </section>

        {/* States */}
        <section className="bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900">States</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Loading</h3>
              <div className="flex flex-wrap gap-4">
                <GradientButton loading>Loading</GradientButton>
                <GradientButton loading variant="success">
                  Processing
                </GradientButton>
                <GradientButton loading variant="warning">
                  Deleting
                </GradientButton>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Disabled</h3>
              <div className="flex flex-wrap gap-4">
                <GradientButton disabled>Disabled</GradientButton>
                <GradientButton disabled variant="success">
                  Disabled Success
                </GradientButton>
                <GradientButton disabled variant="warning">
                  Disabled Warning
                </GradientButton>
                <GradientButton disabled variant="outline">
                  Disabled Outline
                </GradientButton>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Demo */}
        <section className="bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900">Interactive Demo</h2>
          <p className="text-gray-600 mb-4">
            Hover over buttons to see scale and shadow effects. Click to see press animation.
          </p>
          <div className="flex flex-wrap gap-4">
            <GradientButton onClick={() => alert('Primary clicked!')} icon={Home}>
              Click Me
            </GradientButton>
            <GradientButton variant="success" onClick={() => alert('Success clicked!')} icon={Save}>
              Save Changes
            </GradientButton>
            <GradientButton
              variant="warning"
              onClick={() => alert('Warning clicked!')}
              icon={Trash2}
            >
              Delete Item
            </GradientButton>
          </div>
        </section>

        {/* Real-world Examples */}
        <section className="bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900">Real-world Examples</h2>
          <div className="space-y-6">
            {/* Form Actions */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Form Actions</h3>
              <div className="flex gap-3">
                <GradientButton variant="outline">Cancel</GradientButton>
                <GradientButton variant="primary" icon={Save}>
                  Save Draft
                </GradientButton>
                <GradientButton variant="success" icon={Upload}>
                  Submit
                </GradientButton>
              </div>
            </div>

            {/* Card Actions */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Card Actions</h3>
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-semibold mb-2">Property Development</h4>
                <p className="text-sm text-gray-600 mb-4">Luxury apartments in Sandton</p>
                <div className="flex gap-2">
                  <GradientButton size="sm" variant="outline">
                    View Details
                  </GradientButton>
                  <GradientButton size="sm" variant="primary">
                    Edit
                  </GradientButton>
                  <GradientButton size="sm" variant="warning">
                    Delete
                  </GradientButton>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
