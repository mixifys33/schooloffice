import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Users, Calendar } from 'lucide-react';

export const metadata: Metadata = {
  title: 'My Timetable - Teacher Portal',
  description: 'View your teaching schedule and class assignments'
};

export default function TeacherTimetablePage() {
  const timeSlots = [
    '8:00 - 8:40',
    '8:40 - 9:20',
    '9:20 - 10:00',
    '10:00 - 10:20', // Break
    '10:20 - 11:00',
    '11:00 - 11:40',
    '11:40 - 12:20',
    '12:20 - 1:00', // Lunch
    '1:00 - 1:40',
    '1:40 - 2:20',
    '2:20 - 3:00',
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const schedule = {
    'Monday': {
      '8:00 - 8:40': { subject: 'Mathematics', class: 'Form 4A', room: 'Room 101' },
      '8:40 - 9:20': { subject: 'Mathematics', class: 'Form 4B', room: 'Room 101' },
      '10:20 - 11:00': { subject: 'Statistics', class: 'Form 4A', room: 'Room 102' },
      '1:00 - 1:40': { subject: 'Mathematics', class: 'Form 3A', room: 'Room 101' },
    },
    'Tuesday': {
      '8:00 - 8:40': { subject: 'Mathematics', class: 'Form 3B', room: 'Room 101' },
      '9:20 - 10:00': { subject: 'Statistics', class: 'Form 4B', room: 'Room 102' },
      '11:00 - 11:40': { subject: 'Mathematics', class: 'Form 4A', room: 'Room 101' },
      '1:40 - 2:20': { subject: 'Mathematics', class: 'Form 3A', room: 'Room 101' },
    },
    // Add more days as needed
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Timetable</h1>
        <p className="text-muted-foreground">
          Your weekly teaching schedule and class assignments
        </p>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[var(--chart-blue)]" />
                <span className="text-2xl font-bold">18</span>
              </div>
              <p className="text-xs text-muted-foreground">Per week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Subjects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[var(--chart-green)]" />
                <span className="text-2xl font-bold">2</span>
              </div>
              <p className="text-xs text-muted-foreground">Mathematics, Statistics</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[var(--chart-purple)]" />
                <span className="text-2xl font-bold">4</span>
              </div>
              <p className="text-xs text-muted-foreground">Form 3A, 3B, 4A, 4B</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Free Periods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--chart-yellow)]" />
                <span className="text-2xl font-bold">12</span>
              </div>
              <p className="text-xs text-muted-foreground">Available slots</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Schedule</CardTitle>
            <CardDescription>
              Your complete teaching timetable for the week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border p-2 bg-muted text-left font-medium">Time</th>
                    {days.map(day => (
                      <th key={day} className="border p-2 bg-muted text-left font-medium min-w-32">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map(time => (
                    <tr key={time}>
                      <td className="border p-2 font-medium text-sm bg-muted/50">
                        {time}
                      </td>
                      {days.map(day => {
                        const lesson = schedule[day]?.[time];
                        const isBreak = time === '10:00 - 10:20' || time === '12:20 - 1:00';
                        
                        return (
                          <td key={`${day}-${time}`} className="border p-2">
                            {isBreak ? (
                              <div className="text-center text-sm text-muted-foreground">
                                {time === '10:00 - 10:20' ? 'Break' : 'Lunch'}
                              </div>
                            ) : lesson ? (
                              <div className="space-y-1">
                                <Badge variant="default" className="text-xs">
                                  {lesson.subject}
                                </Badge>
                                <p className="text-sm font-medium">{lesson.class}</p>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {lesson.room}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center text-sm text-muted-foreground">
                                Free
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Today's Classes</CardTitle>
              <CardDescription>
                Your schedule for today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { time: '8:00 - 8:40', subject: 'Mathematics', class: 'Form 4A', room: 'Room 101', status: 'completed' },
                  { time: '8:40 - 9:20', subject: 'Mathematics', class: 'Form 4B', room: 'Room 101', status: 'completed' },
                  { time: '10:20 - 11:00', subject: 'Statistics', class: 'Form 4A', room: 'Room 102', status: 'current' },
                  { time: '1:00 - 1:40', subject: 'Mathematics', class: 'Form 3A', room: 'Room 101', status: 'upcoming' },
                ].map((lesson, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          lesson.status === 'completed' ? 'secondary' :
                          lesson.status === 'current' ? 'default' : 'outline'
                        }>
                          {lesson.subject}
                        </Badge>
                        <span className="text-sm font-medium">{lesson.class}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {lesson.time}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {lesson.room}
                        </div>
                      </div>
                    </div>
                    <Badge variant={
                      lesson.status === 'completed' ? 'secondary' :
                      lesson.status === 'current' ? 'default' : 'outline'
                    }>
                      {lesson.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Class Information</CardTitle>
              <CardDescription>
                Quick access to your class details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { class: 'Form 4A', students: 32, subject: 'Mathematics', room: 'Room 101' },
                  { class: 'Form 4B', students: 28, subject: 'Mathematics', room: 'Room 101' },
                  { class: 'Form 3A', students: 35, subject: 'Mathematics', room: 'Room 101' },
                  { class: 'Form 3B', students: 30, subject: 'Mathematics', room: 'Room 101' },
                ].map((classInfo, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{classInfo.class}</p>
                      <p className="text-sm text-muted-foreground">{classInfo.subject}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">{classInfo.students} students</p>
                      <p className="text-muted-foreground">{classInfo.room}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}