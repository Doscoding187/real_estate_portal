import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Phone, Mail, Calendar, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface PropertyDrawerProps {
  property: any | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (property: any) => void;
  onReject: (property: any) => void;
}

export const PropertyDrawer: React.FC<PropertyDrawerProps> = ({
  property,
  isOpen,
  onClose,
  onApprove,
  onReject,
}) => {
  if (!property) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <Badge variant="outline" className="mb-2 capitalize">
                {property.status.replace('_', ' ')}
              </Badge>
              <SheetTitle className="text-xl leading-tight">{property.title}</SheetTitle>
              <SheetDescription className="flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {property.address}, {property.city}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="agent">Agent</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            {/* Price Section */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-sm text-slate-500 mb-1">Asking Price</div>
              <div className="text-2xl font-bold text-slate-900">
                {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(
                  property.price,
                )}
              </div>
              {property.propertyDetails?.size && (
                <div className="text-sm text-slate-500 mt-1">
                  {Math.round(property.price / property.propertyDetails.size)} per m²
                </div>
              )}
            </div>

            {/* Property Specs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="text-xs text-slate-500">Type</div>
                <div className="font-medium capitalize">{property.propertyType}</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-xs text-slate-500">Action</div>
                <div className="font-medium capitalize">{property.action}</div>
              </div>
              {property.propertyDetails && (
                <>
                  <div className="p-3 border rounded-lg">
                    <div className="text-xs text-slate-500">Bedrooms</div>
                    <div className="font-medium">{property.propertyDetails.bedrooms || '-'}</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-xs text-slate-500">Bathrooms</div>
                    <div className="font-medium">{property.propertyDetails.bathrooms || '-'}</div>
                  </div>
                </>
              )}
            </div>

            {/* Description */}
            <div>
              <h4 className="text-sm font-medium mb-2">Description</h4>
              <div className="text-sm text-slate-600 leading-relaxed">{property.description}</div>
            </div>
          </TabsContent>

          <TabsContent value="media">
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-2 gap-2">
                {/* Placeholder for media grid - in real app would map through property.media */}
                {property.thumbnail && (
                  <div className="col-span-2 aspect-video rounded-lg overflow-hidden bg-slate-100">
                    <img
                      src={property.thumbnail}
                      alt="Main"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className="aspect-square rounded-lg bg-slate-100 flex items-center justify-center text-slate-300"
                  >
                    Media {i}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="agent">
            <div className="flex flex-col items-center text-center p-6 border rounded-lg bg-slate-50">
              <Avatar className="h-20 w-20 mb-4">
                <AvatarImage src={property.agent?.profileImage} />
                <AvatarFallback>{property.agent?.firstName?.[0] || '?'}</AvatarFallback>
              </Avatar>
              <h3 className="text-lg font-semibold">
                {property.agent?.firstName} {property.agent?.lastName}
              </h3>
              {property.agent?.isVerified === 1 && (
                <Badge
                  variant="secondary"
                  className="mt-2 bg-blue-100 text-blue-700 hover:bg-blue-100"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Verified Agent
                </Badge>
              )}

              <div className="w-full mt-6 space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={`mailto:${property.owner?.email}`}>
                    <Mail className="h-4 w-4 mr-2" /> {property.owner?.email || 'No email'}
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Phone className="h-4 w-4 mr-2" /> Contact Agent
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <SheetFooter className="mt-8 pt-4 border-t">
          {property.approvalStatus === 'pending' ? (
            <div className="flex gap-2 w-full">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => onApprove(property)}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> Approve Listing
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => onReject(property)}>
                <XCircle className="h-4 w-4 mr-2" /> Reject
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => alert('Request Edit feature coming soon')}
              >
                <AlertTriangle className="h-4 w-4 mr-2" /> Request Edit
              </Button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
