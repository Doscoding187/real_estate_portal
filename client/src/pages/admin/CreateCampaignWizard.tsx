import Step4Budget from '@/components/marketing/wizard/Step4Budget';
import Step5Channels from '@/components/marketing/wizard/Step5Channels';
import Step6Creative from '@/components/marketing/wizard/Step6Creative';
import Step7Review from '@/components/marketing/wizard/Step7Review';

const STEPS = [
  { id: 1, name: 'Details' },
  { id: 2, name: 'Target' },
  { id: 3, name: 'Audience' },
  { id: 4, name: 'Budget' },
  { id: 5, name: 'Channels' },
  { id: 6, name: 'Creative' },
  { id: 7, name: 'Review' },
];

const CreateCampaignWizard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [formData, setFormData] = useState<any>({});

  const createCampaignMutation = trpc.marketing.createCampaign.useMutation();

  const handleNext = async () => {
    if (currentStep === 1 && !campaignId) {
      // Create draft campaign on first step completion
      try {
        const result = await createCampaignMutation.mutateAsync({
          campaignName: formData.campaignName,
          campaignType: formData.campaignType,
          description: formData.description,
          ownerType: user?.role === 'agency_admin' ? 'agency' : 'agent',
          ownerId: user?.agencyId || user?.id || 0,
          targetType: 'listing', // Default, will be updated in step 2
          targetId: 0, // Default
        });
        setCampaignId(result.campaignId);
        setCurrentStep(prev => prev + 1);
      } catch (error) {
        toast.error('Failed to create campaign draft');
      }
    } else {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      navigate('/admin/marketing');
    } else {
      setCurrentStep(prev => Math.max(prev - 1, 1));
    }
  };

  const updateFormData = (data: any) => {
    setFormData((prev: any) => ({ ...prev, ...data }));
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Create Campaign</h1>
            <p className="text-slate-500">Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/marketing')}>Cancel</Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2" />
        <div 
            className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 transition-all duration-300" 
            style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
        />
        <div className="relative flex justify-between">
          {STEPS.map((step) => (
            <div key={step.id} className="flex flex-col items-center gap-2">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step.id < currentStep 
                    ? 'bg-blue-600 text-white' 
                    : step.id === currentStep 
                    ? 'bg-white border-2 border-blue-600 text-blue-600' 
                    : 'bg-white border border-slate-200 text-slate-400'
                }`}
              >
                {step.id < currentStep ? <Check className="w-4 h-4" /> : step.id}
              </div>
              <span className={`text-xs font-medium ${step.id === currentStep ? 'text-blue-600' : 'text-slate-500'}`}>
                {step.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="min-h-[400px]">
        <CardContent className="p-6">
          {currentStep === 1 && (
            <Step1Details 
                data={formData} 
                updateData={updateFormData} 
                onNext={handleNext} 
                isLoading={createCampaignMutation.isPending}
            />
          )}
          {currentStep === 2 && campaignId && (
            <Step2Target
                data={formData}
                updateData={updateFormData}
                onNext={handleNext}
                onBack={handleBack}
                campaignId={campaignId}
            />
          )}
          {currentStep === 3 && campaignId && (
            <Step3Targeting
                data={formData}
                updateData={updateFormData}
                onNext={handleNext}
                onBack={handleBack}
                campaignId={campaignId}
            />
          )}
          {currentStep === 4 && campaignId && (
            <Step4Budget
                data={formData}
                updateData={updateFormData}
                onNext={handleNext}
                onBack={handleBack}
                campaignId={campaignId}
            />
          )}
          {currentStep === 5 && campaignId && (
            <Step5Channels
                data={formData}
                updateData={updateFormData}
                onNext={handleNext}
                onBack={handleBack}
                campaignId={campaignId}
            />
          )}
          {currentStep === 6 && campaignId && (
            <Step6Creative
                data={formData}
                updateData={updateFormData}
                onNext={handleNext}
                onBack={handleBack}
                campaignId={campaignId}
            />
          )}
          {currentStep === 7 && campaignId && (
            <Step7Review
                data={formData}
                campaignId={campaignId}
                onBack={handleBack}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateCampaignWizard;
