'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function WebsiteSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    siteName: '',
    tagline: '',
    primaryColor: '#1e40af',
    secondaryColor: '#64748b',
    accentColor: '#f59e0b',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    contactEmail: '',
    contactPhone: '',
    address: '',
    facebookUrl: '',
    twitterUrl: '',
    instagramUrl: '',
    youtubeUrl: '',
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    showGallery: true,
    showEvents: true,
    showNews: true,
    showTestimonials: true,
    isPublished: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/website/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/website/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        alert('Settings saved successfully!');
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/school-admin/website"
          className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Website Settings</h1>
        <p className="text-gray-600 mt-2">
          Configure your website's appearance and information
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <Section title="Basic Information">
          <Input
            label="Site Name"
            name="siteName"
            value={settings.siteName}
            onChange={handleChange}
            required
          />
          <Input
            label="Tagline"
            name="tagline"
            value={settings.tagline}
            onChange={handleChange}
            placeholder="A brief description of your school"
          />
        </Section>

        {/* Theme Colors */}
        <Section title="Theme Colors">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <ColorInput
              label="Primary Color"
              name="primaryColor"
              value={settings.primaryColor}
              onChange={handleChange}
            />
            <ColorInput
              label="Secondary Color"
              name="secondaryColor"
              value={settings.secondaryColor}
              onChange={handleChange}
            />
            <ColorInput
              label="Accent Color"
              name="accentColor"
              value={settings.accentColor}
              onChange={handleChange}
            />
            <ColorInput
              label="Background"
              name="backgroundColor"
              value={settings.backgroundColor}
              onChange={handleChange}
            />
            <ColorInput
              label="Text Color"
              name="textColor"
              value={settings.textColor}
              onChange={handleChange}
            />
          </div>
        </Section>

        {/* Typography */}
        <Section title="Typography">
          <Select
            label="Heading Font"
            name="headingFont"
            value={settings.headingFont}
            onChange={handleChange}
            options={[
              'Inter',
              'Roboto',
              'Open Sans',
              'Lato',
              'Montserrat',
              'Poppins',
            ]}
          />
          <Select
            label="Body Font"
            name="bodyFont"
            value={settings.bodyFont}
            onChange={handleChange}
            options={[
              'Inter',
              'Roboto',
              'Open Sans',
              'Lato',
              'Montserrat',
              'Poppins',
            ]}
          />
        </Section>

        {/* Contact Information */}
        <Section title="Contact Information">
          <Input
            label="Email"
            name="contactEmail"
            type="email"
            value={settings.contactEmail}
            onChange={handleChange}
          />
          <Input
            label="Phone"
            name="contactPhone"
            value={settings.contactPhone}
            onChange={handleChange}
          />
          <Textarea
            label="Address"
            name="address"
            value={settings.address}
            onChange={handleChange}
            rows={3}
          />
        </Section>

        {/* Social Media */}
        <Section title="Social Media">
          <Input
            label="Facebook URL"
            name="facebookUrl"
            value={settings.facebookUrl}
            onChange={handleChange}
            placeholder="https://facebook.com/yourschool"
          />
          <Input
            label="Twitter URL"
            name="twitterUrl"
            value={settings.twitterUrl}
            onChange={handleChange}
            placeholder="https://twitter.com/yourschool"
          />
          <Input
            label="Instagram URL"
            name="instagramUrl"
            value={settings.instagramUrl}
            onChange={handleChange}
            placeholder="https://instagram.com/yourschool"
          />
          <Input
            label="YouTube URL"
            name="youtubeUrl"
            value={settings.youtubeUrl}
            onChange={handleChange}
            placeholder="https://youtube.com/@yourschool"
          />
        </Section>

        {/* SEO */}
        <Section title="SEO Settings">
          <Input
            label="Meta Title"
            name="metaTitle"
            value={settings.metaTitle}
            onChange={handleChange}
            placeholder="Your School Name - Quality Education"
          />
          <Textarea
            label="Meta Description"
            name="metaDescription"
            value={settings.metaDescription}
            onChange={handleChange}
            rows={3}
            placeholder="A brief description for search engines"
          />
          <Input
            label="Meta Keywords"
            name="metaKeywords"
            value={settings.metaKeywords}
            onChange={handleChange}
            placeholder="school, education, learning"
          />
        </Section>

        {/* Features */}
        <Section title="Website Features">
          <div className="space-y-3">
            <Checkbox
              label="Show Gallery"
              name="showGallery"
              checked={settings.showGallery}
              onChange={handleChange}
            />
            <Checkbox
              label="Show Events"
              name="showEvents"
              checked={settings.showEvents}
              onChange={handleChange}
            />
            <Checkbox
              label="Show News"
              name="showNews"
              checked={settings.showNews}
              onChange={handleChange}
            />
            <Checkbox
              label="Show Testimonials"
              name="showTestimonials"
              checked={settings.showTestimonials}
              onChange={handleChange}
            />
          </div>
        </Section>

        {/* Publish Status */}
        <Section title="Publish Status">
          <Checkbox
            label="Publish Website (Make it visible to the public)"
            name="isPublished"
            checked={settings.isPublished}
            onChange={handleChange}
          />
        </Section>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <Link
            href="/school-admin/website"
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

// Helper Components
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Input({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
}: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}

function Textarea({ label, name, value, onChange, placeholder, rows }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}

function Select({ label, name, value, onChange, options }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {options.map((option: string) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function ColorInput({ label, name, value, onChange }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          name={name}
          value={value}
          onChange={onChange}
          className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={onChange}
          name={name}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}

function Checkbox({ label, name, checked, onChange }: any) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}
