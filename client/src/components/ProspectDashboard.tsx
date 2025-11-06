import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { RecentlyViewedCarousel } from './RecentlyViewedCarousel';
import {
  Calculator,
  Heart,
  Home,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
  Calendar,
  Phone,
  Mail,
  X,
  Target,
  DollarSign,
  Users,
  MapPin,
  Clock,
} from 'lucide-react';

// Session ID generation
const generateSessionId = () => {
  return 'prospect_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
};

interface ProspectDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId?: number;
}

export function ProspectDashboard({ isOpen, onClose, propertyId }: ProspectDashboardProps) {
  const [sessionId] = useState(
    () => localStorage.getItem('prospect_session') || generateSessionId(),
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    income: '',
    incomeRange: '',
    employmentStatus: '',
    combinedIncome: '',
    monthlyExpenses: '',
    monthlyDebts: '',
    dependents: '0',
    savingsDeposit: '',
    creditScore: '',
    hasCreditConsent: false,
    preferredPropertyType: '',
    preferredLocation: '',
    maxCommuteTime: '',
  });

  const { toast } = useToast();

  // Initialize session
  useEffect(() => {
    localStorage.setItem('prospect_session', sessionId);
  }, [sessionId]);

  // Load existing prospect data
  const { data: prospect, refetch: refetchProspect } = trpc.prospects.getProspect.useQuery(
    { sessionId },
    { enabled: isOpen },
  );

  // Load progress and badges
  const { data: progress } = trpc.prospects.getProspectProgress.useQuery(
    { sessionId },
    { enabled: isOpen },
  );

  // Calculate buyability in real-time
  const { data: buyabilityResults, refetch: refetchBuyability } =
    trpc.prospects.calculateBuyability.useQuery(
      {
        income: formData.income ? parseInt(formData.income) * 100 : undefined, // Convert to cents
        incomeRange: (formData.incomeRange as any) || undefined,
        employmentStatus: (formData.employmentStatus as any) || undefined,
        combinedIncome: formData.combinedIncome
          ? parseInt(formData.combinedIncome) * 100
          : undefined,
        monthlyExpenses: formData.monthlyExpenses
          ? parseInt(formData.monthlyExpenses) * 100
          : undefined,
        monthlyDebts: formData.monthlyDebts ? parseInt(formData.monthlyDebts) * 100 : undefined,
        dependents: parseInt(formData.dependents) || 0,
        savingsDeposit: formData.savingsDeposit
          ? parseInt(formData.savingsDeposit) * 100
          : undefined,
        creditScore: formData.creditScore ? parseInt(formData.creditScore) : undefined,
        hasCreditConsent: formData.hasCreditConsent,
      },
      { enabled: isOpen && Object.values(formData).some(v => v !== '') },
    );

  // Load favorites and recommendations
  const { data: favorites } = trpc.prospects.getFavorites.useQuery(
    { sessionId },
    { enabled: isOpen },
  );
  const { data: recommendations } = trpc.prospects.getRecommendedListings.useQuery(
    { sessionId, limit: 6 },
    { enabled: isOpen && prospect?.affordabilityMax },
  );

  // Mutations
  const createProspectMutation = trpc.prospects.createProspect.useMutation();
  const updateProspectMutation = trpc.prospects.updateProspect.useMutation();
  const addFavoriteMutation = trpc.prospects.addFavoriteProperty.useMutation();

  // Initialize form with existing data
  useEffect(() => {
    if (prospect) {
      setFormData({
        email: prospect.email || '',
        phone: prospect.phone || '',
        income: prospect.income ? (prospect.income / 100).toString() : '',
        incomeRange: prospect.incomeRange || '',
        employmentStatus: prospect.employmentStatus || '',
        combinedIncome: prospect.combinedIncome ? (prospect.combinedIncome / 100).toString() : '',
        monthlyExpenses: prospect.monthlyExpenses
          ? (prospect.monthlyExpenses / 100).toString()
          : '',
        monthlyDebts: prospect.monthlyDebts ? (prospect.monthlyDebts / 100).toString() : '',
        dependents: prospect.dependents?.toString() || '0',
        savingsDeposit: prospect.savingsDeposit ? (prospect.savingsDeposit / 100).toString() : '',
        creditScore: prospect.creditScore?.toString() || '',
        hasCreditConsent: prospect.hasCreditConsent === 1,
        preferredPropertyType: prospect.preferredPropertyType || '',
        preferredLocation: prospect.preferredLocation || '',
        maxCommuteTime: prospect.maxCommuteTime?.toString() || '',
      });
    }
  }, [prospect]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      const data = {
        sessionId,
        ...formData,
        income: formData.income ? parseInt(formData.income) * 100 : undefined,
        combinedIncome: formData.combinedIncome
          ? parseInt(formData.combinedIncome) * 100
          : undefined,
        monthlyExpenses: formData.monthlyExpenses
          ? parseInt(formData.monthlyExpenses) * 100
          : undefined,
        monthlyDebts: formData.monthlyDebts ? parseInt(formData.monthlyDebts) * 100 : undefined,
        dependents: parseInt(formData.dependents) || 0,
        savingsDeposit: formData.savingsDeposit
          ? parseInt(formData.savingsDeposit) * 100
          : undefined,
        creditScore: formData.creditScore ? parseInt(formData.creditScore) : undefined,
        maxCommuteTime: formData.maxCommuteTime ? parseInt(formData.maxCommuteTime) : undefined,
      };

      if (prospect) {
        await updateProspectMutation.mutateAsync(data);
      } else {
        await createProspectMutation.mutateAsync(data);
      }

      await refetchProspect();
      await refetchBuyability();

      toast({
        title: 'Profile Updated',
        description: 'Your financial information has been saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save your information. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAddFavorite = async (propertyId: number) => {
    try {
      await addFavoriteMutation.mutateAsync({ sessionId, propertyId });
      toast({
        title: 'Added to Favorites',
        description: 'Property has been added to your favorites.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add favorite. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const steps = [
    {
      title: 'Income & Employment',
      icon: DollarSign,
      fields: ['income', 'incomeRange', 'employmentStatus', 'combinedIncome'],
    },
    {
      title: 'Expenses & Assets',
      icon: Target,
      fields: ['monthlyExpenses', 'monthlyDebts', 'dependents', 'savingsDeposit'],
    },
    {
      title: 'Credit & Preferences',
      icon: Award,
      fields: ['creditScore', 'hasCreditConsent', 'preferredPropertyType', 'preferredLocation'],
    },
  ];

  const getBuyabilityColor = (score?: 'low' | 'medium' | 'high') => {
    switch (score) {
      case 'high':
        return 'text-green-600 bg-green-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getBuyabilityText = (score?: 'low' | 'medium' | 'high') => {
    switch (score) {
      case 'high':
        return "Excellent - You're ready to buy!";
      case 'medium':
        return 'Good - Consider improving your deposit';
      case 'low':
        return 'Limited - Focus on building savings';
      default:
        return 'Enter information to calculate';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.3 }}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Buyability Calculator</h2>
              <p className="text-sm opacity-90">Find properties you can afford</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-white hover:bg-white/20"
            >
              {isCollapsed ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className={`flex-1 overflow-hidden ${isCollapsed ? 'hidden' : 'block'}`}>
          <div className="h-full overflow-y-auto">
            {/* Progress Bar */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Profile Completion</span>
                <span className="text-sm text-gray-600">{progress?.progress || 0}%</span>
              </div>
              <Progress value={progress?.progress || 0} className="h-2" />

              {/* Badges */}
              {progress?.badges && progress.badges.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {progress.badges.map((badge: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      <Award className="w-3 h-3 mr-1" />
                      {badge}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Buyability Results */}
            {buyabilityResults && (
              <div className="p-4 border-b">
                <Alert className={getBuyabilityColor(buyabilityResults.buyabilityScore)}>
                  <TrendingUp className="h-4 w-4" />
                  <AlertDescription>
                    <strong>
                      Buyability Score: {getBuyabilityText(buyabilityResults.buyabilityScore)}
                    </strong>
                    {buyabilityResults.affordabilityMin && buyabilityResults.affordabilityMax && (
                      <div className="mt-2 text-sm">
                        <div>
                          Affordability Range: R
                          {buyabilityResults.affordabilityMin.toLocaleString()} - R
                          {buyabilityResults.affordabilityMax.toLocaleString()}
                        </div>
                        <div>
                          Max Monthly Payment: R
                          {(buyabilityResults.monthlyPaymentCapacity / 100).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Step Navigation */}
            <div className="p-4 border-b">
              <div className="flex space-x-1">
                {steps.map((step, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`flex-1 p-3 rounded-lg text-center transition-all ${
                      currentStep === index
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <step.icon className="w-4 h-4 mx-auto mb-1" />
                    <div className="text-xs font-medium">{step.title}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Form Steps */}
            <div className="p-4 space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Step 1: Income & Employment */}
                  {currentStep === 0 && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="income">Monthly Gross Income (R)</Label>
                        <Input
                          id="income"
                          type="number"
                          placeholder="e.g. 25000"
                          value={formData.income}
                          onChange={e => handleInputChange('income', e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="incomeRange">Income Range</Label>
                        <Select
                          value={formData.incomeRange}
                          onValueChange={value => handleInputChange('incomeRange', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select range" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="under_15k">Under R15,000</SelectItem>
                            <SelectItem value="15k_25k">R15,000 - R25,000</SelectItem>
                            <SelectItem value="25k_50k">R25,000 - R50,000</SelectItem>
                            <SelectItem value="50k_100k">R50,000 - R100,000</SelectItem>
                            <SelectItem value="over_100k">Over R100,000</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="employmentStatus">Employment Status</Label>
                        <Select
                          value={formData.employmentStatus}
                          onValueChange={value => handleInputChange('employmentStatus', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employed">Employed</SelectItem>
                            <SelectItem value="self_employed">Self Employed</SelectItem>
                            <SelectItem value="business_owner">Business Owner</SelectItem>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="retired">Retired</SelectItem>
                            <SelectItem value="unemployed">Unemployed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="combinedIncome">Combined Income (Joint Applications)</Label>
                        <Input
                          id="combinedIncome"
                          type="number"
                          placeholder="Additional income"
                          value={formData.combinedIncome}
                          onChange={e => handleInputChange('combinedIncome', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 2: Expenses & Assets */}
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="monthlyExpenses">Monthly Expenses (R)</Label>
                        <Input
                          id="monthlyExpenses"
                          type="number"
                          placeholder="Rent, utilities, etc."
                          value={formData.monthlyExpenses}
                          onChange={e => handleInputChange('monthlyExpenses', e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="monthlyDebts">Monthly Debts (R)</Label>
                        <Input
                          id="monthlyDebts"
                          type="number"
                          placeholder="Loans, credit cards"
                          value={formData.monthlyDebts}
                          onChange={e => handleInputChange('monthlyDebts', e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="dependents">Number of Dependents</Label>
                        <Input
                          id="dependents"
                          type="number"
                          min="0"
                          value={formData.dependents}
                          onChange={e => handleInputChange('dependents', e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="savingsDeposit">Available Deposit/Savings (R)</Label>
                        <Input
                          id="savingsDeposit"
                          type="number"
                          placeholder="For down payment"
                          value={formData.savingsDeposit}
                          onChange={e => handleInputChange('savingsDeposit', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 3: Credit & Preferences */}
                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your.email@example.com"
                          value={formData.email}
                          onChange={e => handleInputChange('email', e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+27 XX XXX XXXX"
                          value={formData.phone}
                          onChange={e => handleInputChange('phone', e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="creditScore">Credit Score (Optional)</Label>
                        <Input
                          id="creditScore"
                          type="number"
                          min="300"
                          max="850"
                          placeholder="300-850"
                          value={formData.creditScore}
                          onChange={e => handleInputChange('creditScore', e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="preferredPropertyType">Preferred Property Type</Label>
                        <Select
                          value={formData.preferredPropertyType}
                          onValueChange={value => handleInputChange('preferredPropertyType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="What type of property?" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="apartment">Apartment</SelectItem>
                            <SelectItem value="house">House</SelectItem>
                            <SelectItem value="villa">Villa</SelectItem>
                            <SelectItem value="townhouse">Townhouse</SelectItem>
                            <SelectItem value="cluster_home">Cluster Home</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="preferredLocation">Preferred Location/Area</Label>
                        <Input
                          id="preferredLocation"
                          placeholder="City or suburb"
                          value={formData.preferredLocation}
                          onChange={e => handleInputChange('preferredLocation', e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="maxCommuteTime">Max Commute Time (minutes)</Label>
                        <Input
                          id="maxCommuteTime"
                          type="number"
                          placeholder="60"
                          value={formData.maxCommuteTime}
                          onChange={e => handleInputChange('maxCommuteTime', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Recommendations */}
            {recommendations && recommendations.length > 0 && (
              <div className="p-4 border-t">
                <h3 className="font-semibold mb-3 flex items-center">
                  <Target className="w-4 h-4 mr-2" />
                  Recommended for You
                </h3>
                <div className="space-y-3">
                  {recommendations.slice(0, 3).map((property: any) => (
                    <Card key={property.id} className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{property.title}</h4>
                          <p className="text-sm text-gray-600">
                            R{property.price.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {property.city}, {property.province}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddFavorite(property.id)}
                          className="ml-2"
                        >
                          <Heart className="w-3 h-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Recently Viewed */}
            <div className="p-4 border-t">
              <RecentlyViewedCarousel sessionId={sessionId} />
            </div>

            {/* Favorites */}
            {favorites && favorites.length > 0 && (
              <div className="p-4 border-t">
                <h3 className="font-semibold mb-3 flex items-center">
                  <Heart className="w-4 h-4 mr-2" />
                  Your Favorites ({favorites.length})
                </h3>
                <div className="space-y-2">
                  {favorites.slice(0, 3).map((favorite: any) => (
                    <div
                      key={favorite.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div>
                        <p className="text-sm font-medium">{favorite.property.title}</p>
                        <p className="text-xs text-gray-600">
                          R{favorite.property.price.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="p-4 border-t bg-gray-50">
            <Button
              onClick={handleSave}
              className="w-full"
              disabled={createProspectMutation.isLoading || updateProspectMutation.isLoading}
            >
              {createProspectMutation.isLoading || updateProspectMutation.isLoading
                ? 'Saving...'
                : 'Save & Calculate'}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
