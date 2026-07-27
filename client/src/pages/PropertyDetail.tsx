import PropertyDetailPage from './PropertyDetailPage';

interface PropertyDetailProps {
  propertyId?: number;
}

export default function PropertyDetail(props: PropertyDetailProps & Record<string, unknown>) {
  return <PropertyDetailPage {...props} />;
}
