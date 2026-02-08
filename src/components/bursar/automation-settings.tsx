'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AutomationFrequency } from '@/types/enums';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Save, Plus, Trash2, AlertTriangle, Lock, Play } from 'lucide-react';

interface PaymentMilestone {
    week: number;
    percentage: number;
}

interface AutomationSettingsData {
    enableAutomatedReminders: boolean;
    automationFrequency: AutomationFrequency;
    automationDayOfWeek: number;
    gracePeriodDays: number;
    maxRemindersPerMilestone: number;
    paymentMilestones: PaymentMilestone[];
    lockedAt: string | null;
}

export function AutomationSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [settings, setSettings] = useState<AutomationSettingsData>({
        enableAutomatedReminders: false,
        automationFrequency: AutomationFrequency.WEEKLY,
        automationDayOfWeek: 1,
        gracePeriodDays: 3,
        maxRemindersPerMilestone: 2,
        paymentMilestones: [],
        lockedAt: null
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/bursar/settings/automation');
            if (!res.ok) throw new Error('Failed to load settings');
            const data = await res.json();
            setSettings(data);
        } catch (err) {
            console.error(err);
            setError('Could not load automation settings.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            const res = await fetch('/api/bursar/settings/automation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });

            if (!res.ok) throw new Error('Failed to save settings');
            setSuccess('Settings saved successfully');
        } catch (err) {
            console.error(err);
            setError('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleRunNow = async () => {
        if (!confirm('This will immediately check all students and SEND SMS reminders if they match criteria. Are you sure?')) return;

        try {
            setRunning(true);
            setError(null);
            setSuccess(null);
            const res = await fetch('/api/bursar/settings/automation/run', { method: 'POST' });
            const result = await res.json();

            if (!res.ok) throw new Error(result.error || 'Run failed');

            setSuccess(`Automation Run Complete: ${result.sent} sent, ${result.failed} failed, ${result.totalRecipients} checked.`);
        } catch (err) {
            console.error(err);
            setError('Failed to execute automation run');
        } finally {
            setRunning(false);
        }
    };

    const addMilestone = () => {
        setSettings(prev => ({
            ...prev,
            paymentMilestones: [...prev.paymentMilestones, { week: 1, percentage: 0 }]
        }));
    };

    const removeMilestone = (index: number) => {
        setSettings(prev => ({
            ...prev,
            paymentMilestones: prev.paymentMilestones.filter((_, i) => i !== index)
        }));
    };

    const updateMilestone = (index: number, field: keyof PaymentMilestone, value: number) => {
        const newMilestones = [...settings.paymentMilestones];
        newMilestones[index] = { ...newMilestones[index], [field]: value };
        setSettings(prev => ({ ...prev, paymentMilestones: newMilestones }));
    };

    if (loading) return <div className="p-8 text-center">Loading settings...</div>;

    const isLocked = !!settings.lockedAt;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Automation Configuration</h2>
                    <p className="text-muted-foreground">Configure automated fee reminders and enforcement rules.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleRunNow} disabled={running || saving} className="text-[var(--chart-blue)] border-[var(--info-light)] hover:bg-[var(--info-light)]">
                        <Play className="mr-2 h-4 w-4" />
                        {running ? 'Running...' : 'Run Now'}
                    </Button>
                    <Button onClick={handleSave} disabled={saving || running}>
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            {error && <AlertBanner type="error" message={error} />}
            {success && <AlertBanner type="success" message={success} />}

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="p-6 space-y-4">
                    <h3 className="font-semibold text-lg flex items-center">
                        <AlertTriangle className="mr-2 h-5 w-5 text-[var(--warning)]" />
                        General Settings
                    </h3>

                    <div className="flex items-center justify-between p-4 border rounded-lg bg-[var(--bg-surface)]">
                        <div className="space-y-0.5">
                            <label className="text-base font-medium">Enable Automation</label>
                            <p className="text-sm text-muted-foreground">Automatically send reminders based on milestones</p>
                        </div>
                        {/* Simple Switch Implementation since component missing */}
                        <button
                            onClick={() => setSettings(s => ({ ...s, enableAutomatedReminders: !s.enableAutomatedReminders }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.enableAutomatedReminders ? 'bg-[var(--success)]' : 'bg-[var(--border-default)]'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-[var(--bg-main)] transition-transform ${settings.enableAutomatedReminders ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Frequency</label>
                        <Select
                            value={settings.automationFrequency}
                            onValueChange={(val) => setSettings(s => ({ ...s, automationFrequency: val as AutomationFrequency }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Frequency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={AutomationFrequency.WEEKLY}>Weekly</SelectItem>
                                <SelectItem value={AutomationFrequency.BIWEEKLY}>Bi-Weekly</SelectItem>
                                <SelectItem value={AutomationFrequency.TRI_WEEKLY}>Tri-Weekly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Day of Week (1=Mon)</label>
                            <Input
                                type="number"
                                min={1}
                                max={7}
                                value={settings.automationDayOfWeek}
                                onChange={(e) => setSettings(s => ({ ...s, automationDayOfWeek: parseInt(e.target.value) }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Grace Period (Days)</label>
                            <Input
                                type="number"
                                min={0}
                                value={settings.gracePeriodDays}
                                onChange={(e) => setSettings(s => ({ ...s, gracePeriodDays: parseInt(e.target.value) }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Max Reminders per Milestone</label>
                        <Input
                            type="number"
                            min={1}
                            value={settings.maxRemindersPerMilestone}
                            onChange={(e) => setSettings(s => ({ ...s, maxRemindersPerMilestone: parseInt(e.target.value) }))}
                        />
                    </div>
                </Card>

                <Card className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg flex items-center">
                            {isLocked ? <Lock className="mr-2 h-5 w-5 text-[var(--danger)]" /> : <AlertTriangle className="mr-2 h-5 w-5 text-[var(--accent-primary)]" />}
                            Payment Milestones
                        </h3>
                        {!isLocked && (
                            <Button size="sm" variant="outline" onClick={addMilestone}>
                                <Plus className="mr-2 h-4 w-4" /> Add
                            </Button>
                        )}
                    </div>

                    {isLocked && (
                        <AlertBanner type="warning" message="Milestones are locked because the term has started." />
                    )}

                    <div className="space-y-3">
                        {settings.paymentMilestones.length === 0 && (
                            <div className="text-center p-4 text-[var(--text-muted)] border border-dashed rounded-lg">
                                No milestones configured.
                            </div>
                        )}
                        {settings.paymentMilestones.map((milestone, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 border rounded-md bg-[var(--bg-main)]">
                                <div className="flex-1">
                                    <label className="text-xs text-muted-foreground block">Week</label>
                                    <Input
                                        type="number"
                                        value={milestone.week}
                                        readOnly={isLocked}
                                        onChange={(e) => updateMilestone(index, 'week', parseInt(e.target.value))}
                                        className="h-8"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-muted-foreground block">Required %</label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            value={milestone.percentage}
                                            readOnly={isLocked}
                                            onChange={(e) => updateMilestone(index, 'percentage', parseFloat(e.target.value))}
                                            className="h-8 pr-6"
                                        />
                                        <span className="absolute right-2 top-1.5 text-xs text-[var(--text-muted)]">%</span>
                                    </div>
                                </div>
                                {!isLocked && (
                                    <Button variant="ghost" size="icon" onClick={() => removeMilestone(index)} className="mt-4 text-[var(--danger)] hover:text-[var(--chart-red)] hover:bg-[var(--danger-light)]">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}
