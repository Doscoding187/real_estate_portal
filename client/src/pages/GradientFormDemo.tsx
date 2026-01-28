/**
 * Gradient Form Components Demo
 * Visual demonstration of all gradient form components
 */

import { useState } from 'react';
import { GradientButton } from '@/components/ui/GradientButton';
import { GradientInput } from '@/components/ui/GradientInput';
import { GradientTextarea } from '@/components/ui/GradientTextarea';
import { GradientSelect, GradientSelectItem } from '@/components/ui/GradientSelect';
import { GradientCheckbox } from '@/components/ui/GradientCheckbox';
import { Save, Send } from 'lucide-react';

export default function GradientFormDemo() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    country: '',
    message: '',
    terms: false,
    newsletter: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Simple validation
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.country) newErrors.country = 'Please select a country';
    if (!formData.terms) newErrors.terms = 'You must accept the terms';

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      alert('Form submitted successfully!');
      console.log('Form data:', formData);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Gradient Form Components
          </h1>
          <p className="text-gray-600">
            Premium form inputs with gradient styling and smooth animations
          </p>
        </div>

        {/* Form Examples */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Input Examples */}
          <section className="bg-white rounded-2xl p-6 shadow-lg space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">Input Fields</h2>

            <GradientInput
              label="Full Name"
              placeholder="John Doe"
              required
              helperText="Enter your full legal name"
            />

            <GradientInput
              label="Email Address"
              type="email"
              placeholder="john@example.com"
              required
            />

            <GradientInput
              label="Phone Number"
              type="tel"
              placeholder="+1 (555) 000-0000"
              helperText="Include country code"
            />

            <GradientInput
              label="With Error"
              placeholder="This field has an error"
              error="This field is required"
            />

            <GradientInput
              label="Disabled Field"
              placeholder="Cannot edit this"
              disabled
              value="Disabled value"
            />
          </section>

          {/* Textarea Examples */}
          <section className="bg-white rounded-2xl p-6 shadow-lg space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">Textarea</h2>

            <GradientTextarea
              label="Message"
              placeholder="Type your message here..."
              rows={4}
              helperText="Maximum 500 characters"
            />

            <GradientTextarea
              label="Auto-resize Textarea"
              placeholder="This textarea grows as you type..."
              autoResize
              helperText="Try typing multiple lines"
            />

            <GradientTextarea
              label="With Error"
              placeholder="This field has an error"
              error="Message is too short"
              rows={3}
            />
          </section>

          {/* Select Examples */}
          <section className="bg-white rounded-2xl p-6 shadow-lg space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">Select Dropdown</h2>

            <GradientSelect
              label="Country"
              placeholder="Select a country"
              required
              helperText="Choose your country of residence"
            >
              <GradientSelectItem value="us">United States</GradientSelectItem>
              <GradientSelectItem value="uk">United Kingdom</GradientSelectItem>
              <GradientSelectItem value="ca">Canada</GradientSelectItem>
              <GradientSelectItem value="au">Australia</GradientSelectItem>
              <GradientSelectItem value="za">South Africa</GradientSelectItem>
            </GradientSelect>

            <GradientSelect label="Subscription Plan" placeholder="Choose a plan">
              <GradientSelectItem value="free">Free Trial</GradientSelectItem>
              <GradientSelectItem value="basic">Basic - $9/mo</GradientSelectItem>
              <GradientSelectItem value="premium">Premium - $29/mo</GradientSelectItem>
            </GradientSelect>

            <GradientSelect
              label="With Error"
              placeholder="Select an option"
              error="Please select an option"
            >
              <GradientSelectItem value="option1">Option 1</GradientSelectItem>
              <GradientSelectItem value="option2">Option 2</GradientSelectItem>
            </GradientSelect>
          </section>

          {/* Checkbox Examples */}
          <section className="bg-white rounded-2xl p-6 shadow-lg space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">Checkboxes</h2>

            <GradientCheckbox
              label="Accept Terms and Conditions"
              description="I agree to the terms of service and privacy policy"
            />

            <GradientCheckbox
              label="Subscribe to Newsletter"
              description="Receive updates about new features and promotions"
            />

            <GradientCheckbox
              label="Enable Notifications"
              description="Get notified about important updates"
              defaultChecked
            />

            <GradientCheckbox
              label="With Error"
              description="This checkbox has an error state"
              error="You must check this box to continue"
            />

            <GradientCheckbox
              label="Disabled Checkbox"
              description="This option is not available"
              disabled
            />
          </section>
        </div>

        {/* Complete Form Example */}
        <section className="bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Complete Form Example</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <GradientInput
                label="Full Name"
                placeholder="John Doe"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                error={errors.name}
              />

              <GradientInput
                label="Email Address"
                type="email"
                placeholder="john@example.com"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                error={errors.email}
              />
            </div>

            <GradientSelect
              label="Country"
              placeholder="Select your country"
              required
              value={formData.country}
              onValueChange={value => setFormData({ ...formData, country: value })}
              error={errors.country}
            >
              <GradientSelectItem value="us">United States</GradientSelectItem>
              <GradientSelectItem value="uk">United Kingdom</GradientSelectItem>
              <GradientSelectItem value="ca">Canada</GradientSelectItem>
              <GradientSelectItem value="au">Australia</GradientSelectItem>
              <GradientSelectItem value="za">South Africa</GradientSelectItem>
            </GradientSelect>

            <GradientTextarea
              label="Message"
              placeholder="Tell us about yourself..."
              rows={4}
              value={formData.message}
              onChange={e => setFormData({ ...formData, message: e.target.value })}
              helperText="Optional: Share any additional information"
            />

            <div className="space-y-4">
              <GradientCheckbox
                label="I accept the Terms and Conditions"
                description="By checking this box, you agree to our terms of service"
                checked={formData.terms}
                onCheckedChange={checked => setFormData({ ...formData, terms: checked as boolean })}
                error={errors.terms}
              />

              <GradientCheckbox
                label="Subscribe to newsletter"
                description="Receive updates and special offers"
                checked={formData.newsletter}
                onCheckedChange={checked =>
                  setFormData({ ...formData, newsletter: checked as boolean })
                }
              />
            </div>

            <div className="flex gap-4 pt-4">
              <GradientButton
                type="button"
                variant="outline"
                onClick={() => {
                  setFormData({
                    name: '',
                    email: '',
                    country: '',
                    message: '',
                    terms: false,
                    newsletter: false,
                  });
                  setErrors({});
                }}
              >
                Reset
              </GradientButton>

              <GradientButton type="button" variant="primary" icon={Save}>
                Save Draft
              </GradientButton>

              <GradientButton type="submit" variant="success" icon={Send}>
                Submit Form
              </GradientButton>
            </div>
          </form>
        </section>

        {/* States Demo */}
        <section className="bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Interactive States</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Focus States</h3>
              <p className="text-sm text-gray-600 mb-4">
                Click on any input to see the gradient border animation
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <GradientInput placeholder="Focus me to see gradient border" />
                <GradientSelect placeholder="Open me to see animations">
                  <GradientSelectItem value="1">Option 1</GradientSelectItem>
                  <GradientSelectItem value="2">Option 2</GradientSelectItem>
                </GradientSelect>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Error States</h3>
              <p className="text-sm text-gray-600 mb-4">
                Error states show gradient error messages and shake animation
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <GradientInput placeholder="Input with error" error="This field is required" />
                <GradientCheckbox label="Checkbox with error" error="You must accept this" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
