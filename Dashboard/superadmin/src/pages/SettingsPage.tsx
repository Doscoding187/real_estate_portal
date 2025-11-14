import React, { useState } from 'react';
import {
  CreditCard,
  Mail,
  Shield,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

const SettingsPage: React.FC = () => {
  // Payment Gateway State
  const [paymentGateway, setPaymentGateway] = useState({
    provider: 'PayFast',
    merchantId: '',
    apiKey: '',
  });

  // Email Configuration State
  const [emailConfig, setEmailConfig] = useState({
    service: 'SendGrid',
    fromEmail: '',
    apiKey: '',
  });

  // POPIA Compliance State
  const [popiaCompliance, setPopiaCompliance] = useState({
    dataRetention: '2 years',
    cookieConsent: true,
    dataExportRequests: true,
  });

  // Feature Toggles State
  const [featureToggles, setFeatureToggles] = useState({
    ownerListings: true,
    developerAccounts: true,
    virtualTours: false,
  });

  const handlePaymentGatewayChange = (field: string, value: string) => {
    setPaymentGateway({ ...paymentGateway, [field]: value });
  };

  const handleEmailConfigChange = (field: string, value: string) => {
    setEmailConfig({ ...emailConfig, [field]: value });
  };

  const handlePopiaComplianceChange = (
    field: string,
    value: string | boolean
  ) => {
    setPopiaCompliance({ ...popiaCompliance, [field]: value });
  };

  const handleFeatureToggleChange = (field: string, value: boolean) => {
    setFeatureToggles({ ...featureToggles, [field]: value });
  };

  const handleTestConnection = () => {
    console.log('Testing payment gateway connection...');
    // Implement connection test logic here
  };

  const handleSendTestEmail = () => {
    console.log('Sending test email...');
    // Implement test email logic here
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600">
          Configure platform settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Gateway */}
        <div className="card p-6">
          <div className="flex items-center mb-4">
            <CreditCard className="h-5 w-5 text-slate-700 mr-2" />
            <h2 className="text-lg font-bold text-slate-900">
              Payment Gateway
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Provider
              </label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={paymentGateway.provider}
                onChange={e =>
                  handlePaymentGatewayChange('provider', e.target.value)
                }
              >
                <option value="PayFast">PayFast</option>
                <option value="Peach Payments">Peach Payments</option>
                <option value="PayGate">PayGate</option>
                <option value="Stripe">Stripe</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Merchant ID
              </label>
              <input
                type="text"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={paymentGateway.merchantId}
                onChange={e =>
                  handlePaymentGatewayChange('merchantId', e.target.value)
                }
                placeholder="Enter merchant ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={paymentGateway.apiKey}
                onChange={e =>
                  handlePaymentGatewayChange('apiKey', e.target.value)
                }
                placeholder="Enter API key"
              />
            </div>

            <button
              onClick={handleTestConnection}
              className="btn-primary w-full"
            >
              Test Connection
            </button>
          </div>
        </div>

        {/* Email Configuration */}
        <div className="card p-6">
          <div className="flex items-center mb-4">
            <Mail className="h-5 w-5 text-slate-700 mr-2" />
            <h2 className="text-lg font-bold text-slate-900">
              Email Configuration
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email Service
              </label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={emailConfig.service}
                onChange={e =>
                  handleEmailConfigChange('service', e.target.value)
                }
              >
                <option value="SendGrid">SendGrid</option>
                <option value="Mailgun">Mailgun</option>
                <option value="AWS SES">AWS SES</option>
                <option value="SMTP">SMTP</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                From Email
              </label>
              <input
                type="email"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={emailConfig.fromEmail}
                onChange={e =>
                  handleEmailConfigChange('fromEmail', e.target.value)
                }
                placeholder="noreply@homefind.za"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={emailConfig.apiKey}
                onChange={e =>
                  handleEmailConfigChange('apiKey', e.target.value)
                }
                placeholder="Enter API key"
              />
            </div>

            <button
              onClick={handleSendTestEmail}
              className="btn-primary w-full"
            >
              Send Test Email
            </button>
          </div>
        </div>

        {/* POPIA Compliance */}
        <div className="card p-6">
          <div className="flex items-center mb-4">
            <Shield className="h-5 w-5 text-slate-700 mr-2" />
            <h2 className="text-lg font-bold text-slate-900">
              POPIA Compliance
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Data Retention Period
              </label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={popiaCompliance.dataRetention}
                onChange={e =>
                  handlePopiaComplianceChange('dataRetention', e.target.value)
                }
              >
                <option value="1 year">1 year</option>
                <option value="2 years">2 years</option>
                <option value="3 years">3 years</option>
                <option value="5 years">5 years</option>
                <option value="Indefinitely">Indefinitely</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Cookie Consent
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  Enable cookie consent banner for users
                </p>
              </div>
              <button
                onClick={() =>
                  handlePopiaComplianceChange(
                    'cookieConsent',
                    !popiaCompliance.cookieConsent
                  )
                }
                className="relative inline-flex h-6 w-11 items-center rounded-full"
              >
                {popiaCompliance.cookieConsent ? (
                  <ToggleRight className="h-6 w-11 text-blue-600" />
                ) : (
                  <ToggleLeft className="h-6 w-11 text-slate-300" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Data Export Requests
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  Allow users to request data export
                </p>
              </div>
              <button
                onClick={() =>
                  handlePopiaComplianceChange(
                    'dataExportRequests',
                    !popiaCompliance.dataExportRequests
                  )
                }
                className="relative inline-flex h-6 w-11 items-center rounded-full"
              >
                {popiaCompliance.dataExportRequests ? (
                  <ToggleRight className="h-6 w-11 text-blue-600" />
                ) : (
                  <ToggleLeft className="h-6 w-11 text-slate-300" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="card p-6">
          <div className="flex items-center mb-4">
            <ToggleLeft className="h-5 w-5 text-slate-700 mr-2" />
            <h2 className="text-lg font-bold text-slate-900">
              Feature Toggles
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Owner Listings
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  Allow "For Sale by Owner" listings
                </p>
              </div>
              <button
                onClick={() =>
                  handleFeatureToggleChange(
                    'ownerListings',
                    !featureToggles.ownerListings
                  )
                }
                className="relative inline-flex h-6 w-11 items-center rounded-full"
              >
                {featureToggles.ownerListings ? (
                  <ToggleRight className="h-6 w-11 text-blue-600" />
                ) : (
                  <ToggleLeft className="h-6 w-11 text-slate-300" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Developer Accounts
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  Enable developer account registrations
                </p>
              </div>
              <button
                onClick={() =>
                  handleFeatureToggleChange(
                    'developerAccounts',
                    !featureToggles.developerAccounts
                  )
                }
                className="relative inline-flex h-6 w-11 items-center rounded-full"
              >
                {featureToggles.developerAccounts ? (
                  <ToggleRight className="h-6 w-11 text-blue-600" />
                ) : (
                  <ToggleLeft className="h-6 w-11 text-slate-300" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Virtual Tours
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  Enable 360° property tours
                </p>
              </div>
              <button
                onClick={() =>
                  handleFeatureToggleChange(
                    'virtualTours',
                    !featureToggles.virtualTours
                  )
                }
                className="relative inline-flex h-6 w-11 items-center rounded-full"
              >
                {featureToggles.virtualTours ? (
                  <ToggleRight className="h-6 w-11 text-blue-600" />
                ) : (
                  <ToggleLeft className="h-6 w-11 text-slate-300" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
