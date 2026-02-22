'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function WebsiteDashboard() {
  const router = useRouter();
  const [settings, setSettings] = useState<any>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, pagesRes] = await Promise.all([
        fetch('/api/website/settings'),
        fetch('/api/website/pages'),
      ]);

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }

      if (pagesRes.ok) {
        const pagesData = await pagesRes.json();
        setPages(pagesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading website dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Website Management</h1>
        <p className="text-gray-600 mt-2">
          Design and manage your school's public website
        </p>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Website Status
            </h2>
            <p className="text-gray-600 mt-1">
              {settings?.isPublished ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  ✓ Published
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                  ⚠ Draft
                </span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Site Name</p>
            <p className="text-lg font-semibold text-gray-900">
              {settings?.siteName || 'Not Set'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <QuickActionCard
          title="Website Settings"
          description="Configure theme, branding, and SEO"
          icon="⚙️"
          href="/school-admin/website/settings"
        />
        <QuickActionCard
          title="Pages"
          description={`Manage pages (${pages.length} total)`}
          icon="📄"
          href="/school-admin/website/pages"
        />
        <QuickActionCard
          title="News & Blog"
          description="Create and manage news articles"
          icon="📰"
          href="/school-admin/website/news"
        />
        <QuickActionCard
          title="Events"
          description="Manage school events calendar"
          icon="📅"
          href="/school-admin/website/events"
        />
        <QuickActionCard
          title="Gallery"
          description="Upload and organize photos"
          icon="🖼️"
          href="/school-admin/website/gallery"
        />
        <QuickActionCard
          title="Testimonials"
          description="Showcase testimonials"
          icon="💬"
          href="/school-admin/website/testimonials"
        />
        <QuickActionCard
          title="Team"
          description="Display staff and leadership"
          icon="👥"
          href="/school-admin/website/team"
        />
        <QuickActionCard
          title="Media Library"
          description="Manage all media files"
          icon="📁"
          href="/school-admin/website/media"
        />
        <QuickActionCard
          title="Contact Submissions"
          description="View contact form messages"
          icon="✉️"
          href="/school-admin/website/contact"
        />
      </div>

      {/* Recent Pages */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Pages</h2>
          <Link
            href="/school-admin/website/pages/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Page
          </Link>
        </div>

        {pages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No pages created yet</p>
            <Link
              href="/school-admin/website/pages/new"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Page
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {pages.slice(0, 5).map((page) => (
              <div
                key={page.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div>
                  <h3 className="font-medium text-gray-900">{page.title}</h3>
                  <p className="text-sm text-gray-600">/{page.slug}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      page.status === 'PUBLISHED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {page.status}
                  </span>
                  <Link
                    href={`/school-admin/website/pages/${page.id}`}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Edit →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  icon,
  href,
}: {
  title: string;
  description: string;
  icon: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 hover:border-blue-300"
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </Link>
  );
}
