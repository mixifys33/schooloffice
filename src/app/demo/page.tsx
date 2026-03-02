import { Metadata } from 'next';
import DemoGallery from '@/components/demo/demo-gallery';

export const metadata: Metadata = {
  title: 'Demo Videos - SchoolOffice.academy',
  description: 'Watch demo videos to learn how SchoolOffice helps schools manage academics, fees, and communication.',
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <DemoGallery />
    </div>
  );
}
