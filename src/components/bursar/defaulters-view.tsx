'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Download, MessageSquare, Ban, CheckCircle, AlertCircle } from 'lucide-react';

interface Defaulter {
    studentId: string;
    name: string;
    class: string;
    totalFees: number;
    paidAmount: number;
    balance: number;
    paidPercentage: number;
    guardianName: string;
    guardianPhone: string;
    isExempted: boolean;
    accountStatus: string;
    lastReminder: string | null;
    reminderCount: number;
    trackerStatus: string;
}

export function DefaultersView() {
    const [data, setData] = useState<Defaulter[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchDefaulters();
    }, []);

    const fetchDefaulters = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/bursar/defaulters');
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = data.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.guardianName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Fee Defaulters</h2>
                    <p className="text-muted-foreground">Monitor students with outstanding balances and automation status.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                </div>
            </div>

            <Card className="p-4">
                <div className="flex gap-4 mb-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search student, class, or parent..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline">Filter</Button>
                </div>

                <div className="rounded-md border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                <th className="p-4 text-left font-medium">Student</th>
                                <th className="p-4 text-left font-medium">Class</th>
                                <th className="p-4 text-left font-medium">Paid %</th>
                                <th className="p-4 text-left font-medium">Balance</th>
                                <th className="p-4 text-left font-medium">Last Reminder</th>
                                <th className="p-4 text-left font-medium">Status</th>
                                <th className="p-4 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="p-10 text-center text-muted-foreground">Loading...</td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-10 text-center text-muted-foreground">No defaulters found.</td>
                                </tr>
                            ) : (
                                filteredData.map((student) => (
                                    <tr key={student.studentId} className="border-b last:border-0 hover:bg-muted/50">
                                        <td className="p-4">
                                            <div className="font-medium">{student.name}</div>
                                            <div className="text-xs text-muted-foreground">{student.guardianName}</div>
                                        </td>
                                        <td className="p-4">{student.class}</td>
                                        <td className="p-4 hidden sm:table-cell">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-16 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${student.paidPercentage >= 100 ? 'bg-[var(--success)]' : student.paidPercentage < 50 ? 'bg-[var(--danger)]' : 'bg-[var(--warning)]'}`}
                                                        style={{ width: `${Math.min(student.paidPercentage, 100)}%` }}
                                                    />
                                                </div>
                                                {student.paidPercentage.toFixed(0)}%
                                            </div>
                                        </td>
                                        <td className="p-4 font-medium text-[var(--chart-red)]">
                                            {student.balance.toLocaleString()}
                                        </td>
                                        <td className="p-4">
                                            {student.lastReminder ? new Date(student.lastReminder).toLocaleDateString() : 'Never'}
                                            {student.reminderCount > 0 && (
                                                <Badge variant="outline" className="ml-2 text-xs">{student.reminderCount}</Badge>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {student.isExempted ? (
                                                <Badge variant="secondary">Exempted</Badge>
                                            ) : (
                                                <Badge className={student.accountStatus === 'CRITICAL' ? 'bg-[var(--danger)]' : 'bg-[var(--warning)]'}>
                                                    {student.accountStatus}
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <Button size="sm" variant="ghost">
                                                <MessageSquare className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
