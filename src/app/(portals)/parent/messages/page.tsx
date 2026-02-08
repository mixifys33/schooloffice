import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MessageCircle, Search, Filter, Mail, Phone, Bell } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Messages - Parent Portal',
  description: 'View and manage communication from school'
};

export default function ParentMessagesPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground">
          Communication from school, teachers, and administration
        </p>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Unread</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[var(--chart-blue)]" />
                <span className="text-2xl font-bold">3</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">SMS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[var(--chart-green)]" />
                <span className="text-2xl font-bold">12</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Announcements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[var(--chart-purple)]" />
                <span className="text-2xl font-bold">5</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-[var(--chart-yellow)]" />
                <span className="text-2xl font-bold">47</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Message Center</CardTitle>
            <CardDescription>
              All communication from your child's school
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <Input 
                  placeholder="Search messages..." 
                  className="w-full"
                  icon={<Search className="h-4 w-4" />}
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>

            <div className="space-y-4">
              {[
                {
                  id: 1,
                  type: 'announcement',
                  from: 'School Administration',
                  subject: 'Parent-Teacher Conference Schedule',
                  preview: 'Dear parents, we are pleased to announce the upcoming parent-teacher conferences...',
                  date: '2024-02-03',
                  time: '10:30 AM',
                  unread: true,
                  priority: 'high'
                },
                {
                  id: 2,
                  type: 'sms',
                  from: 'Attendance System',
                  subject: 'Daily Attendance Update',
                  preview: 'Your child John Doe was present today. Classes attended: 6/6',
                  date: '2024-02-03',
                  time: '3:45 PM',
                  unread: true,
                  priority: 'normal'
                },
                {
                  id: 3,
                  type: 'teacher',
                  from: 'Ms. Johnson - Mathematics',
                  subject: 'Assignment Reminder',
                  preview: 'This is a reminder that the mathematics assignment is due tomorrow...',
                  date: '2024-02-02',
                  time: '2:15 PM',
                  unread: true,
                  priority: 'normal'
                },
                {
                  id: 4,
                  type: 'finance',
                  from: 'Bursar Office',
                  subject: 'Fee Payment Confirmation',
                  preview: 'Thank you for your payment of $500.00 for Term 2 fees...',
                  date: '2024-02-01',
                  time: '11:20 AM',
                  unread: false,
                  priority: 'normal'
                },
                {
                  id: 5,
                  type: 'announcement',
                  from: 'School Administration',
                  subject: 'School Closure Notice',
                  preview: 'Due to maintenance work, the school will be closed on Friday...',
                  date: '2024-01-31',
                  time: '4:00 PM',
                  unread: false,
                  priority: 'high'
                },
              ].map((message) => (
                <div 
                  key={message.id} 
                  className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 ${
                    message.unread ? 'bg-[var(--info-light)] border-[var(--info-light)]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          message.type === 'announcement' ? 'default' :
                          message.type === 'sms' ? 'secondary' :
                          message.type === 'teacher' ? 'outline' : 'destructive'
                        }>
                          {message.type}
                        </Badge>
                        {message.priority === 'high' && (
                          <Badge variant="destructive">High Priority</Badge>
                        )}
                        {message.unread && (
                          <Badge variant="outline">New</Badge>
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className={`font-medium ${message.unread ? 'font-semibold' : ''}`}>
                            {message.subject}
                          </h3>
                          <div className="text-sm text-muted-foreground">
                            {message.date} at {message.time}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          From: {message.from}
                        </p>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {message.preview}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center mt-6">
              <Button variant="outline">Load More Messages</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Message Categories</CardTitle>
              <CardDescription>
                Browse messages by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { category: 'Announcements', count: 5, icon: Bell, color: 'text-[var(--chart-blue)]' },
                  { category: 'Attendance Updates', count: 12, icon: Phone, color: 'text-[var(--chart-green)]' },
                  { category: 'Academic Updates', count: 8, icon: Mail, color: 'text-[var(--chart-purple)]' },
                  { category: 'Financial Notices', count: 3, icon: MessageCircle, color: 'text-[var(--chart-yellow)]' },
                ].map((item) => (
                  <div key={item.category} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <item.icon className={`h-5 w-5 ${item.color}`} />
                      <span className="font-medium">{item.category}</span>
                    </div>
                    <Badge variant="outline">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common message actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Mark All as Read
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter by Date Range
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Search className="h-4 w-4 mr-2" />
                  Advanced Search
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Bell className="h-4 w-4 mr-2" />
                  Notification Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}