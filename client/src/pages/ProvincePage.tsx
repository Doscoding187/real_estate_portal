import { getProvinceGuideContent } from '@shared/provinceGuideContent';
import ProvinceDiscoveryPage from './ProvinceDiscoveryPage';
import ProvinceEditorialPage from './ProvinceEditorialPage';

export default function ProvincePage({ params }: { params: { province: string } }) {
  const guide = getProvinceGuideContent(params.province.trim().toLowerCase());
  return guide ? (
    <ProvinceEditorialPage key={guide.slug} guide={guide} />
  ) : (
    <ProvinceDiscoveryPage params={params} />
  );
}
