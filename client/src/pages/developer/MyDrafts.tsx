import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Clock,
  MapPin,
  Trash2,
  FileEdit,
  Loader2,
  AlertCircle,
  FileText,
  Plus,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function MyDrafts() {
  const [, setLocation] = useLocation();
  const [draftToDelete, setDraftToDelete] = useState<number | null>(null);

  const { data: drafts, isLoading, refetch } = trpc.developer.getDrafts.useQuery();
  const deleteDraft = trpc.developer.deleteDraft.useMutation({
    onSuccess: () => {
      toast.success('Draft deleted successfully');
      refetch();
      setDraftToDelete(null);
    },
    onError: error => {
      toast.error('Failed to delete draft', {
        description: error.message,
      });
    },
  });

  const handleResumeDraft = (draftId: number) => {
    // Navigate to wizard with draft ID in URL
    setLocation(`/developer/create-development?draftId=${draftId}`);
  };

  const handleDeleteDraft = (draftId: number) => {
    setDraftToDelete(draftId);
  };

  const confirmDelete = () => {
    if (draftToDelete) {
      deleteDraft.mutate({ id: draftToDelete });
    }
  };

  const calculateProgress = (currentStep: number) => {
    return Math.round((currentStep / 6) * 100);
  };

  const getProgressColor = (progress: number) => {
    if (progress < 30) return 'bg-red-500';
    if (progress < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">My Development Drafts</h1>
            <p className="text-slate-600">Resume your saved development listings</p>
          </div>
          <Button
            onClick={() => setLocation('/developer/create-development')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Development
          </Button>
        </div>
      </div>

      {/* Drafts List */}
      {!drafts || drafts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No drafts yet</h3>
            <p className="text-slate-500 text-center mb-6">
              Start creating a development listing and your progress will be automatically saved as
              a draft.
            </p>
            <Button onClick={() => setLocation('/developer/create-development')} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Development
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drafts.map(draft => {
            const draftData = draft.draftData as any;
            const progress = draft.progress || calculateProgress(draft.currentStep);
            const progressColor = getProgressColor(progress);

            return (
              <Card key={draft.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-1">
                        {draft.draftName || 'Untitled Development'}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {draftData.address || draftData.city || 'No location set'}
                      </CardDescription>
                    </div>
                    <Building2 className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-600">Progress</span>
                      <span className="font-semibold text-slate-900">{progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${progressColor} transition-all duration-300`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Draft Details */}
                  <div className="space-y-2 text-sm">
                    {draftData.city && draftData.province && (
                      <div className="flex items-center text-slate-600">
                        <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="line-clamp-1">
                          {draftData.city}, {draftData.province}
                        </span>
                      </div>
                    )}
                    {draftData.unitTypes && draftData.unitTypes.length > 0 && (
                      <div className="flex items-center text-slate-600">
                        <Building2 className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>{draftData.unitTypes.length} unit type(s)</span>
                      </div>
                    )}
                    <div className="flex items-center text-slate-500">
                      <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span>
                        {draft.lastModified
                          ? `Updated ${formatDistanceToNow(new Date(draft.lastModified), { addSuffix: true })}`
                          : 'Recently saved'}
                      </span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex gap-2">
                  <Button
                    onClick={() => handleResumeDraft(draft.id)}
                    className="flex-1"
                    variant="default"
                  >
                    <FileEdit className="w-4 h-4 mr-2" />
                    Resume
                  </Button>
                  <Button
                    onClick={() => handleDeleteDraft(draft.id)}
                    variant="outline"
                    size="icon"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={draftToDelete !== null} onOpenChange={() => setDraftToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Delete Draft?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this draft? This action cannot be undone and all your
              progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteDraft.isPending}
            >
              {deleteDraft.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Draft'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
