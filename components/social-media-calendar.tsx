'use client'

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Calendar, momentLocalizer, Views } from 'react-big-calendar'
import moment from 'moment'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar as CalendarIcon, Trash2, Edit, Plus, Link, MessageSquare, Clock, Gift, Cake, Utensils, Globe, Plane, Book, Heart, CreditCard, Briefcase, Users, Home, MoreHorizontal, Check, BarChart2, TrendingUp, Share2, Info, Download, Upload, Copy, Mail } from 'lucide-react'
import { RRule, RRuleSet, rrulestr } from 'rrule'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createEvents } from 'ics'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
// import { notify } from "@/utils/notifications"; // Assuming you have a notification utility
import { format, parse, differenceInDays } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // Import the CSS for styling
import { v4 as uuidv4 } from 'uuid';
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { saveAs } from 'file-saver';

const localizer = momentLocalizer(moment)

// Define types for events, public events, and personal calendars
type EventCategory = 'personal' | 'family' | 'work' | 'other'

type Event = {
  id?: string
  title: string
  start: Date
  end: Date
  type: 'post' | 'birthday' | 'anniversary' | 'eatout' | 'meeting' | 'worlddates' | 'holiday' | 'study' | 'hobby' | 'payment'
  category: EventCategory
  location?: string
  webLink?: string
  description?: string; // New field
  source?: string; // Added source to Event type
  color?: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
  reminder?: number;
  tags?: string[];
}

type PublicEvent = {
  id: number
  title: string
  date: Date
  source: string
  type: Event['type']
  location?: string
  webLink?: string
  dateAdded: Date
}

type PersonalCalendar = {
  id: string
  name: string
  color: string
  shareLink?: string
  permissions: {
    view: string[]
    edit: string[]
  }
}

// Sample public events data
const initialPublicEvents: PublicEvent[] = [
  { 
    id: 1, 
    title: "Tech Conference", 
    date: new Date(2024, 9, 15, 9, 0), 
    source: "TechEvents", 
    type: 'post',
    location: "San Francisco, CA",
    webLink: "https://techconference.com",
    dateAdded: new Date(2024, 8, 1)
  },
  { 
    id: 2, 
    title: "Social Media Day", 
    date: new Date(2024, 9, 16, 10, 30), 
    source: "GlobalDays", 
    type: 'post',
    dateAdded: new Date(2024, 8, 5)
  },
  // Liverpool FC events
  {
    id: 3,
    title: "Liverpool vs Manchester United",
    date: new Date(2024, 9, 20, 15, 0),
    source: "Liverpool FC",
    type: 'post',
    location: "Anfield, Liverpool",
    webLink: "https://www.liverpoolfc.com/match/2024-25/men/fixtures-results",
    dateAdded: new Date(2024, 8, 10)
  },
  {
    id: 4,
    title: "Liverpool vs Everton",
    date: new Date(2024, 10, 5, 15, 0),
    source: "Liverpool FC",
    type: 'post',
    location: "Anfield, Liverpool",
    webLink: "https://www.liverpoolfc.com/match/2024-25/men/fixtures-results",
    dateAdded: new Date(2024, 8, 15)
  },
  {
    id: 5,
    title: "Arsenal vs Liverpool",
    date: new Date(2024, 10, 12, 17, 30),
    source: "Liverpool FC",
    type: 'post',
    location: "Emirates Stadium, London",
    webLink: "https://www.liverpoolfc.com/match/2024-25/men/fixtures-results",
    dateAdded: new Date(2024, 8, 20)
  }
  // Add more events as needed
]

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute z-10 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm tooltip dark:bg-gray-700">
          {content}
        </div>
      )}
    </div>
  );
};

const eventColors = {
  post: '#4CAF50',
  birthday: '#FF9800',
  anniversary: '#E91E63',
  eatout: '#9C27B0',
  meeting: '#2196F3',
  worlddates: '#00BCD4',
  holiday: '#F44336',
  study: '#795548',
  hobby: '#8BC34A',
  payment: '#607D8B'
};

export default function SocialMediaCalendar() {
  // State declarations
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isAddingEvent, setIsAddingEvent] = useState(false)
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    title: '',
    start: null,
    end: null,
    type: 'post',
    category: 'personal',
    location: '',
    description: '',
    tags: [],
    isRecurring: false,
    recurrencePattern: '',
    reminder: 0
  });
  const [view, setView] = useState(Views.MONTH)
  const [date, setDate] = useState(new Date())
  const [personalCalendars, setPersonalCalendars] = useState<PersonalCalendar[]>([
    { id: uuidv4(), name: "Work", color: "#2196F3", permissions: { view: [], edit: [] } },
    { id: uuidv4(), name: "Personal", color: "#4CAF50", permissions: { view: [], edit: [] } },
    { id: uuidv4(), name: "Family", color: "#FF9800", permissions: { view: [], edit: [] } },
  ])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<Event['type'] | 'all'>('all')
  const [filterCategory, setFilterCategory] = useState<EventCategory | 'all'>('all')
  const [followedCalendars, setFollowedCalendars] = useState([
    { id: 1, name: "Liverpool FC", followed: true },
    { id: 2, name: "TechEvents", followed: true },
    { id: 3, name: "GlobalDays", followed: true },
  ])
  const [editingCalendar, setEditingCalendar] = useState<PersonalCalendar | null>(null)
  const [publicEvents, setPublicEvents] = useState<PublicEvent[]>(initialPublicEvents); // Changed to state
  const [likedEvents, setLikedEvents] = useState<Set<number>>(new Set());

  // Add this new state for public calendar filter
  const [filterPublicCalendar, setFilterPublicCalendar] = useState<string>('all')

  const fileInputRef = useRef(null); // Declare the file input reference

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedCalendarForSharing, setSelectedCalendarForSharing] = useState<PersonalCalendar | null>(null);
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');

  const [eventShareDialogOpen, setEventShareDialogOpen] = useState(false);
  const [selectedEventForSharing, setSelectedEventForSharing] = useState<Event | null>(null);

  const [totalLikes, setTotalLikes] = useState(0);

  const [isAddEventDialogOpen, setIsAddEventDialogOpen] = useState(false);

  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // Event handlers
  const handleSelectEvent = (event: Event) => {
    setNewEvent({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end),
    });
    setIsAddEventDialogOpen(true);
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setNewEvent({
      title: '',
      start,
      end,
      type: 'post',
      category: 'personal',
      location: '',
      description: '',
      tags: [],
      isRecurring: false,
      recurrencePattern: '',
      reminder: 0
    });
    setIsAddEventDialogOpen(true);
  };

  const [openDialog, setOpenDialog] = useState(false); // New state for dialog visibility

  const handleAddOrUpdateEvent = () => {
    if (!newEvent.title || !newEvent.start || !newEvent.end) {
      toast.error("Please fill in the required fields.");
      return;
    }

    const eventToAddOrUpdate: Event = {
      id: newEvent.id || uuidv4(),
      ...newEvent,
      tags: newEvent.tags || [], // Ensure tags are included
      color: eventColors[newEvent.type as keyof typeof eventColors]
    };

    setEvents((prevEvents) => {
      if (newEvent.id) {
        return prevEvents.map(ev => ev.id === newEvent.id ? eventToAddOrUpdate : ev);
      } else {
        return [...prevEvents, eventToAddOrUpdate];
      }
    });

    setIsAddEventDialogOpen(false);
    setNewEvent({});
    toast.success(newEvent.id ? "Event updated successfully!" : "Event added successfully!");
  };

  const handleDeleteEvent = () => {
    if (newEvent.id) {
      setEvents((prevEvents) => prevEvents.filter(ev => ev.id !== newEvent.id));
      setIsAddEventDialogOpen(false);
      setNewEvent({});
      toast.success("Event deleted successfully!");
    }
  };

  const handleLinkPublicEvent = useCallback((publicEvent: PublicEvent) => {
    const existingEvent = events.find(event => 
      event.title === publicEvent.title && 
      event.start.getTime() === publicEvent.date.getTime() &&
      event.source === publicEvent.source
    )

    if (!existingEvent) {
      const newLinkedEvent: Event = {
        id: uuidv4(),
        title: publicEvent.title,
        start: publicEvent.date,
        end: new Date(publicEvent.date.getTime() + 60 * 60 * 1000), // Default to 1 hour duration
        type: publicEvent.type,
        category: 'other',
        source: publicEvent.source,
        location: publicEvent.location,
        webLink: publicEvent.webLink,
        description: '',
      }
      setEvents(prevEvents => [...prevEvents, newLinkedEvent])
    }
  }, [events, setEvents])

  const handleToggleFollowCalendar = (calendarId: number) => {
    setFollowedCalendars(prevCalendars => 
      prevCalendars.map(calendar => 
        calendar.id === calendarId ? { ...calendar, followed: !calendar.followed } : calendar
      )
    )
  }

  // useEffect for filtering events based on followed calendars
  useEffect(() => {
    // Effect logic to filter events based on followed calendars
    const followedSources = followedCalendars.filter(cal => cal.followed).map(cal => cal.name);
    setEvents(prevEvents => prevEvents.filter(event => !event.source || followedSources.includes(event.source)));

    // Reset the public calendar filter if the currently selected calendar is unfollowed
    if (filterPublicCalendar !== 'all' && !followedSources.includes(filterPublicCalendar)) {
      setFilterPublicCalendar('all');
    }
  }, [followedCalendars, filterPublicCalendar]); // Include necessary dependencies

  // Helper functions
  const expandRecurringEvents = useCallback((events: Event[]) => {
    const expandedEvents: Event[] = []
    events.forEach(event => {
      if (event.recurrence) {
        const rule = rrulestr(event.recurrence)
        const occurrences = rule.between(new Date(), new Date(new Date().getFullYear() + 1, 0, 1))
        occurrences.forEach((date, index) => {
          expandedEvents.push({
            ...event,
            id: event.id + index,
            start: date,
            end: new Date(date.getTime() + (event.end.getTime() - event.start.getTime()))
          })
        })
      } else {
        expandedEvents.push(event)
      }
    })
    return expandedEvents
  }, [])

  // Memoized filtered events
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || event.type === filterType;
      const matchesCategory = filterCategory === 'all' || event.category === filterCategory;
      const matchesPublicCalendar = filterPublicCalendar === 'all' 
        ? true 
        : event.source === filterPublicCalendar || (!event.source && filterPublicCalendar === 'personal');
      const matchesTag = !tagFilter || (event.tags && event.tags.includes(tagFilter));
      return matchesSearch && matchesType && matchesCategory && matchesPublicCalendar && matchesTag;
    });
  }, [events, searchTerm, filterType, filterCategory, filterPublicCalendar, tagFilter]);

  const eventStyleGetter = useCallback(
    (event: Event) => {
      const backgroundColor = event.source
        ? getSourceColor(event.source)
        : personalCalendars.find(cal => cal.name.toLowerCase() === event.category)?.color || '#3174ad';

      return {
        style: {
          backgroundColor,
          borderRadius: '4px',
          opacity: event.end < new Date() ? 0.5 : 0.8, // Make past events semi-transparent
          color: 'white',
          border: '0px',
          display: 'block',
        },
      };
    },
    [personalCalendars]
  );

  const getEventTypeIcon = (type: Event['type']) => {
    switch(type) {
      case 'post': return <MessageSquare className="inline-block mr-2" size={16} />
      case 'birthday': return <Cake className="inline-block mr-2" size={16} />
      case 'anniversary': return <Gift className="inline-block mr-2" size={16} />
      case 'eatout': return <Utensils className="inline-block mr-2" size={16} />
      case 'meeting': return <Clock className="inline-block mr-2" size={16} />
      case 'worlddates': return <Globe className="inline-block mr-2" size={16} />
      case 'holiday': return <Plane className="inline-block mr-2" size={16} />
      case 'study': return <Book className="inline-block mr-2" size={16} />
      case 'hobby': return <Heart className="inline-block mr-2" size={16} />
      case 'payment': return <CreditCard className="inline-block mr-2" size={16} />
      default: return <CalendarIcon className="inline-block mr-2" size={16} />
    }
  }

  const getCategoryIcon = (category: EventCategory) => {
    switch(category) {
      case 'personal': return <Users className="inline-block mr-2" size={16} />
      case 'family': return <Home className="inline-block mr-2" size={16} />
      case 'work': return <Briefcase className="inline-block mr-2" size={16} />
      default: return <MoreHorizontal className="inline-block mr-2" size={16} />
    }
  }

  const onView = useCallback((newView: any) => setView(newView), [setView])

  const onNavigate = useCallback((newDate: Date) => setDate(newDate), [setDate])

  const handleAddPersonalCalendar = useCallback(() => {
    const newCalendarName = prompt("Enter the name for your new calendar:");
    if (newCalendarName) {
      const newCalendar: PersonalCalendar = {
        id: uuidv4(),
        name: newCalendarName,
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        permissions: { view: [], edit: [] },
      };
      setPersonalCalendars(prevCalendars => [...prevCalendars, newCalendar]);
      toast.success("Calendar added successfully!"); // User feedback
    } else {
      toast.error("Calendar name cannot be empty."); // Error handling
    }
  }, []);

  const handleEditPersonalCalendar = (calendar: PersonalCalendar) => {
    setEditingCalendar(calendar)
  }

  const handleUpdatePersonalCalendar = () => {
    if (editingCalendar) {
      setPersonalCalendars(prevCalendars =>
        prevCalendars.map(cal =>
          cal.id === editingCalendar.id ? editingCalendar : cal
        )
      )
      setEditingCalendar(null)
    }
  }

  const handleDeletePersonalCalendar = (id: string) => {
    setPersonalCalendars(prevCalendars =>
      prevCalendars.filter(cal => cal.id !== id)
    )
  }

  const groupedPublicEvents = useMemo(() => {
    return publicEvents.reduce((acc, event) => {
      if (!acc[event.source]) {
        acc[event.source] = [];
      }
      acc[event.source].push(event);
      return acc;
    }, {} as Record<string, PublicEvent[]>);
  }, [publicEvents]);

  const filteredGroupedPublicEvents = useMemo(() => {
    const followedSources = followedCalendars
      .filter(cal => cal.followed)
      .map(cal => cal.name);

    return publicEvents.filter(event => followedSources.includes(event.source));
  }, [publicEvents, followedCalendars]);

  // New function to get the next upcoming event
  const getNextEvent = () => {
    const now = new Date()
    return filteredEvents
      .filter(event => event.start > now)
      .sort((a, b) => a.start.getTime() - b.start.getTime())[0]
  }

  // New function to count events by category
  const countEventsByCategory = () => {
    return filteredEvents.reduce((acc, event) => {
      acc[event.category] = (acc[event.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  // Corrected function to get the most active category
  const getMostActiveCategory = () => {
    const categoryCounts = countEventsByCategory()
    return Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
  }

  // Corrected function to get the busiest day
  const getBusiestDay = () => {
    const eventsByDay = filteredEvents.reduce((acc, event) => {
      const day = format(event.start, 'EEEE')
      acc[day] = (acc[day] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(eventsByDay).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
  }

  const getSourceColor = (source: string) => {
    switch(source) {
      case 'Liverpool FC':
        return '#C8102E'  // Liverpool red
      case 'TechEvents':
        return '#C8102E'  // Tech blue
      case 'GlobalDays':
        return '#4CAF50'  // Global green
      default:
        return '#FBBC05'  // Default yellow
    }
  }

  const handleDeletePublicEvent = (id: number) => {
    setPublicEvents(prevEvents => prevEvents.filter(event => event.id !== id));
  };

  const handleSaveEvent = () => {
    // Validate required fields
    if (!selectedEvent?.title || !selectedEvent?.start || !selectedEvent?.end) {
      showAlert('Title, start date, and end date are required.');
      return;
    }

    if (selectedEvent.id) {
      // Update existing event
      setEvents(prevEvents => prevEvents.map(event => 
        event.id === selectedEvent.id ? { ...event, ...selectedEvent } : event
      ));
    } else {
      // Add new event
      const newEvent = { ...selectedEvent, id: uuidv4() };
      setEvents(prevEvents => [...prevEvents, newEvent]);
    }
    
    setSelectedEvent(null); // Clear the selected event after saving
    setOpenDialog(false); // Close the dialog after saving
  };

  const handleShareEvent = (event: Event) => {
    const isPrivateEvent = ['personal', 'work', 'family'].includes(event.category.toLowerCase());
    if (!isPrivateEvent) {
      setSelectedEventForSharing(event);
      setEventShareDialogOpen(true); // Open the share dialog
    } else {
      toast.error("This event cannot be shared.");
    }
  };

  const handleLikeEvent = (eventId: number) => {
    setLikedEvents(prev => {
      const newLiked = new Set(prev);
      if (newLiked.has(eventId)) {
        newLiked.delete(eventId);
      } else {
        newLiked.add(eventId);
      }
      return newLiked;
    });
  };

  const handleShareCalendar = (calendarId: string) => {
    const calendar = personalCalendars.find(cal => cal.id === calendarId);
    if (calendar) {
      setSelectedCalendarForSharing(calendar);
      setShareDialogOpen(true);
    }
  };

  const handleDownloadICS = (eventsToDownload: Event[], filename: string) => {
    const icsEvents = eventsToDownload.map(event => ({
      start: [
        event.start.getFullYear(),
        event.start.getMonth() + 1,
        event.start.getDate(),
        event.start.getHours(),
        event.start.getMinutes()
      ],
      end: [
        event.end.getFullYear(),
        event.end.getMonth() + 1,
        event.end.getDate(),
        event.end.getHours(),
        event.end.getMinutes()
      ],
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      categories: [event.category],
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      organizer: { name: 'Your Name', email: 'your@email.com' }
    }));

    createEvents(icsEvents, (error, value) => {
      if (error) {
        console.log(error);
        toast.error("Failed to generate ICS file");
        return;
      }

      const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
      saveAs(blob, filename);
      toast.success(`${filename} downloaded successfully!`);
    });
  };

  const handleDownloadSingleEvent = (event: Event) => {
    handleDownloadICS([event], `${event.title}.ics`);
  };

  const handleDownloadFilteredEvents = () => {
    handleDownloadICS(filteredEvents, 'filtered_events.ics');
  };

  const handleDownloadAllEvents = () => {
    handleDownloadICS(events, 'all_events.ics');
  };

  const handleDownloadPersonalCalendar = (calendar: PersonalCalendar) => {
    const eventsInCalendar = events.filter(event => event.category.toLowerCase() === calendar.name.toLowerCase());
    handleDownloadICS(eventsInCalendar, `${calendar.name}.ics`);
  };

  const showAlert = (message: string) => {
    alert(message); // Replace with a more sophisticated notification system if needed
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onerror = () => {
          showAlert('Error reading the file. Please try again.');
        };
        reader.onload = (e) => {
            if (!e.target?.result) {
                showAlert('File is empty or unreadable.');
                return;
            }
            const csvContent = e.target.result;
            const rows = csvContent.split('\n').slice(1); // Skip header row
            const newEvents = rows.map((row, index) => {
                const [title, startDate, endDate, type, category] = row.split(',');
                
                // Check for undefined values and handle them
                if (!title || !startDate || !endDate || !type || !category) {
                    console.warn(`Skipping row ${index + 1} due to missing values: ${row}`);
                    return null; // Skip this row
                }

                return {
                    id: uuidv4(), // Unique ID for each event
                    title: title.trim(),
                    start: moment(startDate.trim(), 'YYYY-MM-DD HH:mm:ss').toDate(), // Use moment to parse date
                    end: moment(endDate.trim(), 'YYYY-MM-DD HH:mm:ss').toDate(),     // Use moment to parse date
                    type: type.trim(),
                    category: category.trim(),
                };
            }).filter(event => event !== null); // Filter out null values

            // Sort events in descending order (latest dates first) while still prioritizing "New Year's Eve Party" if it is in the future
            const sortedEvents = newEvents.sort((a, b) => {
                const now = new Date();
                // Prioritize "New Year's Eve Party" if in the future
                if (a.title === "New Year's Eve Party" && a.start >= now) return -1;
                if (b.title === "New Year's Eve Party" && b.start >= now) return 1;
                // Sort by start date in descending order (latest dates first)
                return b.start - a.start; // Changed to descending order
            });

            setEvents((prevEvents) => [...prevEvents, ...sortedEvents]);
        };
        reader.readAsText(file);
    }
  }

  const openEventDialog = (event: Event) => {
    setSelectedEvent(event);
    setOpenDialog(true);
  };

  // Function to handle direct sharing via email
  const handleDirectShare = (email: string, calendarId: string) => {
    if (!email) {
      toast.error("Please enter a valid email address."); // Show error toast
      return;
    }
    // Implement email sharing logic here
    console.log(`Sharing calendar ${calendarId} with ${email}`);
    toast.success(`An invitation has been sent to ${email}.`); // Show success toast
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-1 p-4 overflow-auto">
        <Card className="mb-4">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Social Media Calendar</CardTitle>
                <CardDescription>Manage your personal and public events</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleDownloadAllEvents} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download All Events
                </Button>
                <Button onClick={() => handleDownloadICS(events)} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download Calendar
                </Button>
                <Button onClick={() => fileInputRef.current.click()} variant="outline" className="ml-2 bg-gray-700 hover:bg-gray-600 text-white border-gray-600">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Calendar
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".csv" 
                  style={{ display: 'none' }} 
                  onChange={handleFileUpload} 
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Calendar
              localizer={localizer}
              events={filteredEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 500 }}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              view={view}
              onView={onView}
              date={date}
              onNavigate={onNavigate}
              components={{
                event: (props: { event: Event; title: string }) => (
                  <div className="flex items-center">
                    {getEventTypeIcon(props.event.type)}
                    <span className="ml-1 text-sm">{props.title}</span>
                    {getCategoryIcon(props.event.category)}
                  </div>
                ),
              }}
              eventPropGetter={eventStyleGetter}
              views={['month', 'week', 'day', 'agenda']}
            />
          </CardContent>
        </Card>

        {/* Dialog for adding/editing events */}
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent className="bg-gray-800 text-white border-gray-700">
            <DialogHeader>
              <DialogTitle>{selectedEvent?.id ? 'Edit Event' : 'Add New Event'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="event-title">Title</Label>
                <Input
                  id="event-title"
                  value={selectedEvent?.title || ''}
                  onChange={(e) => setSelectedEvent({ ...selectedEvent, title: e.target.value })}
                  placeholder="Enter event title"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <Label htmlFor="event-start">Start Time</Label>
                  <Input
                    id="event-start"
                    type="datetime-local"
                    value={format(selectedEvent?.start || new Date(), 'yyyy-MM-dd\'T\'HH:mm')}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, start: new Date(e.target.value) })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="event-end">End Time</Label>
                  <Input
                    id="event-end"
                    type="datetime-local"
                    value={format(selectedEvent?.end || new Date(), 'yyyy-MM-dd\'T\'HH:mm')}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, end: new Date(e.target.value) })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="event-type">Type</Label>
                <Select value={selectedEvent?.type} onValueChange={(value) => setSelectedEvent({ ...selectedEvent, type: value as Event['type'] })}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder={selectedEvent?.type} />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {['post', 'birthday', 'anniversary', 'eatout', 'meeting', 'worlddates', 'holiday', 'study', 'hobby', 'payment'].map((type) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center">
                          {getEventTypeIcon(type as Event['type'])}
                          <span className="ml-2">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="event-category">Category</Label>
                <Select value={selectedEvent?.category} onValueChange={(value) => setSelectedEvent({ ...selectedEvent, category: value as EventCategory })}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder={selectedEvent?.category} />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {personalCalendars.map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.name.toLowerCase()}>
                        <div className="flex items-center">
                          <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: calendar.color }}></div>
                          {calendar.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="event-location">Location</Label>
                <Input
                  id="event-location"
                  value={selectedEvent?.location || ''}
                  onChange={(e) => setSelectedEvent({ ...selectedEvent, location: e.target.value })}
                  placeholder="Enter event location"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="event-webLink">Web Link</Label>
                <Input
                  id="event-webLink"
                  value={selectedEvent?.webLink || ''}
                  onChange={(e) => setSelectedEvent({ ...selectedEvent, webLink: e.target.value })}
                  placeholder="https://example.com"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleSaveEvent} className="bg-blue-600 hover:bg-blue-700">
                  {selectedEvent?.id ? 'Update Event' : 'Add Event'}
                </Button>
                {selectedEvent?.id && (
                  <Button variant="destructive" onClick={() => handleDeleteEvent(selectedEvent.id)} className="bg-red-600 hover:bg-red-700">
                    Delete
                  </Button>
                )}
                <Button variant="outline" onClick={() => { setSelectedEvent(null); setOpenDialog(false); }} className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Event Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {filteredEvents
                  .sort((a, b) => b.start.getTime() - a.start.getTime())
                  .map(event => {
                    const isPrivateEvent = ['personal', 'work', 'family'].includes(event.category.toLowerCase());
                    const isPastEvent = event.end < new Date(); // Check if the event has passed
                    return (
                      <div key={event.id} className={`flex items-center justify-between py-2 px-3 mb-2 rounded-md transition-all hover:shadow-md ${isPastEvent ? 'text-gray-400' : ''}`}>
                        <div className="flex-1 flex items-center space-x-2 overflow-hidden">
                          <div 
                            className="w-3 h-3 flex-shrink-0 rounded-full" 
                            style={{ backgroundColor: event.source ? getSourceColor(event.source) : personalCalendars.find(cal => cal.name.toLowerCase() === event.category)?.color }}
                          ></div>
                          {getEventTypeIcon(event.type)}
                          <span className="font-medium truncate">{event.title}</span>
                          <span className="text-sm">
                            {format(event.start, 'MMM d, HH:mm')}
                          </span>
                          {event.location && (
                            <span className="text-sm truncate">| {event.location}</span>
                          )}
                          {event.source && (
                            <span className="text-xs bg-white bg-opacity-20 px-1 rounded">
                              {event.source}
                            </span>
                          )}
                          {event.webLink && (
                            <a 
                              href={event.webLink} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-white hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                        <div className="flex-shrink-0 ml-2 space-x-1">
                          {!event.source && (
                            <Button variant="ghost" size="icon" onClick={() => openEventDialog(event)} aria-label="Edit Event">
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {isPrivateEvent ? (
                            <Tooltip content="This event can't be shared">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                disabled
                                aria-label="Share Event"
                              >
                                <Share2 className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleShareEvent(event)} // Call the updated share function
                              aria-label="Share Event"
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteEvent(event.id)} aria-label="Delete Event">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDownloadSingleEvent(event)} aria-label="Download Event">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Public Calendar Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {filteredGroupedPublicEvents
                  .sort((a, b) => b.date.getTime() - a.date.getTime()) // Changed to descending order
                  .map(event => {
                    const isPastEvent = event.date < new Date(); // Check if the public event has passed
                    return (
                      <div key={event.id} className={`flex items-center justify-between py-2 border-b last:border-b-0 ${isPastEvent ? 'text-gray-400' : ''}`}>
                        <div className="flex-1">
                          <div className="flex items-center">
                            {getEventTypeIcon(event.type)}
                            <span className="font-medium ml-2">{event.title}</span>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            <span>{format(event.date, 'MMM d, yyyy HH:mm')}</span>
                            {event.location && (
                              <span className="ml-2">| {event.location}</span>
                            )}
                          </div>
                          <div className="flex items-center text-xs text-gray-400 mt-1">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: getSourceColor(event.source) }}
                            ></div>
                            {event.source}
                          </div>
                          {event.webLink && (
                            <a href={event.webLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm mt-1 inline-block">
                              Event Link
                            </a>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            Added: {moment(event.dateAdded).fromNow()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleLikeEvent(event.id)}
                            className={`p-1 rounded-full ${likedEvents.has(event.id) ? "bg-red-100" : ""}`}
                            aria-label="Like Event"
                          >
                            <Heart 
                              className={`h-4 w-4 ${likedEvents.has(event.id) ? "text-red-500" : "text-gray-500"}`} 
                              fill={likedEvents.has(event.id) ? "currentColor" : "none"} 
                            />
                          </button>
                          {event.likeCount && <span className="text-xs text-gray-500">{event.likeCount}</span>}
                          <Button variant="ghost" size="icon" onClick={() => handleLinkPublicEvent(event)} aria-label="Link Event">
                            <Link className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="w-80 m-4 space-y-4 overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Next Event:</span>
                <span>{getNextEvent()?.title || 'No upcoming events'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Heart className="h-5 w-5 text-red-500" />
                <span className="font-medium">Total Likes:</span>
                <span>{likedEvents.size}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-500" />
                <span className="font-medium">Public Calendars Followed:</span>
                <span>{followedCalendars.filter(cal => cal.followed).length}</span>
              </div>
              <div className="flex items-center space-x-2">
                <BarChart2 className="h-5 w-5 text-purple-500" />
                <span className="font-medium">Total Events:</span>
                <span>{filteredEvents.length}</span>
              </div>
              <div className="space-y-2">
                {Object.entries(countEventsByCategory()).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon(category as EventCategory)}
                      <span>{category.charAt(0).toUpperCase() + category.slice(1)}</span>
                    </div>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span className="font-medium">Most Active Category:</span>
                <span>{getMostActiveCategory()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Busiest Day:</span>
                <span>{getBusiestDay()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Followed Public Calendars</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              {followedCalendars.map(calendar => (
                <div key={calendar.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-2" 
                      style={{ backgroundColor: getSourceColor(calendar.name) }}
                    ></div>
                    {calendar.name}
                  </div>
                  <Button
                    variant={calendar.followed ? "default" : "outline"}
                    onClick={() => handleToggleFollowCalendar(calendar.id)}
                  >
                    {calendar.followed ? 'Unfollow' : 'Follow'}
                  </Button>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="w-full">
                <Input
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={filterType} onValueChange={(value) => setFilterType(value as Event['type'] | 'all')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {['post', 'birthday', 'anniversary', 'eatout', 'meeting', 'worlddates', 'holiday', 'study', 'hobby', 'payment'].map((type) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center">
                        {getEventTypeIcon(type as Event['type'])}
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={(value) => setFilterCategory(value as EventCategory | 'all')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {personalCalendars
                    .filter(calendar => calendar.name.toLowerCase() !== 'personal')  // Exclude "Personal" from the dropdown
                    .map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.name.toLowerCase()}>
                        <div className="flex items-center">
                          <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: calendar.color }}></div>
                          {calendar.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select value={filterPublicCalendar} onValueChange={(value) => setFilterPublicCalendar(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by public calendar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Calendars</SelectItem>
                  <SelectItem value="personal">Personal Events</SelectItem>
                  {followedCalendars
                    .filter(calendar => calendar.followed)
                    .map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.name}>
                        {calendar.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select onValueChange={setTagFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Tags</SelectItem>
                  {Array.from(new Set(events.flatMap(e => e.tags || []))).map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="w-full mt-2" onClick={handleDownloadFilteredEvents}>
              <Download className="h-4 w-4 mr-2" />
              Download Filtered Events
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              Personal Calendars
              <Button variant="outline" size="sm" onClick={handleAddPersonalCalendar}>
                <Plus className="h-4 w-4 mr-2" />
                Add Calendar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              {personalCalendars.map(calendar => (
                <div key={calendar.id} className="flex items-center justify-between py-2">
                  {editingCalendar && editingCalendar.id === calendar.id ? (
                    <>
                      <Input
                        value={editingCalendar.name}
                        onChange={(e) => setEditingCalendar({...editingCalendar, name: e.target.value})}
                        className="w-1/2 mr-2"
                      />
                      <Input
                        type="color"
                        value={editingCalendar.color}
                        onChange={(e) => setEditingCalendar({...editingCalendar, color: e.target.value})}
                        className="w-12 h-8 p-0 mr-2"
                      />
                      <Button variant="ghost" size="icon" onClick={handleUpdatePersonalCalendar} aria-label="Save Calendar">
                        <Check className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center">
                        <div 
                          className="w-4 h-4 rounded-full mr-2" 
                          style={{ backgroundColor: calendar.color }}
                        ></div>
                        {calendar.name}
                      </div>
                      <div>
                        {calendar.name.toLowerCase() !== 'personal' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleShareCalendar(calendar.id)}
                            title="Share Calendar"
                            aria-label="Share Calendar"
                    >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEditPersonalCalendar(calendar)}
                          title="Edit Calendar"
                          aria-label="Edit Calendar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {calendar.name !== "Personal" && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeletePersonalCalendar(calendar.id)}
                            title="Delete Calendar"
                            aria-label="Delete Calendar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDownloadPersonalCalendar(calendar)}
                          title="Download Calendar" 
                          aria-label="Download Calendar"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Share Calendar: {selectedCalendarForSharing?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Calendar Link</Label>
              <div className="flex items-center">
                <Input
                  readOnly
                  value={`https://yourapp.com/calendars/${selectedCalendarForSharing?.id}`}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(`https://yourapp.com/calendars/${selectedCalendarForSharing?.id}`)
                      .then(() => {
                        toast.success("Calendar link copied to clipboard!");
                      })
                      .catch(() => {
                        toast.error("Failed to copy the link.");
                      });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  // Implement share via email
                  window.location.href = `mailto:?subject=${encodeURIComponent(`Sharing Calendar: ${selectedCalendarForSharing?.name}`)}&body=${encodeURIComponent(`Check out this calendar: https://yourapp.com/calendars/${selectedCalendarForSharing?.id}`)}`;
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Share via Email
              </Button>
              {/* Add more sharing options as needed */}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog for sharing the selected event */}
      <Dialog open={eventShareDialogOpen} onOpenChange={setEventShareDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Share Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Event Link</Label>
              <div className="flex items-center">
                <Input
                  readOnly
                  value={`https://yourapp.com/events/${selectedEventForSharing?.id}`}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(`https://yourapp.com/events/${selectedEventForSharing?.id}`);
                    toast.success("Event link copied to clipboard!");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  // Implement share via email
                  window.location.href = `mailto:?subject=${encodeURIComponent(selectedEventForSharing?.title)}&body=${encodeURIComponent(`Check out this event: https://yourapp.com/events/${selectedEventForSharing?.id}`)}`;
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Share via Email
              </Button>
              {/* Add more sharing options as needed */}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast Container */}
      <ToastContainer />

      {/* Add Event Dialog */}
      <Dialog open={isAddEventDialogOpen} onOpenChange={setIsAddEventDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{newEvent.id ? "Update Event" : "Add Event"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Title Field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Title</Label>
              <Input
                id="title"
                className="col-span-3"
                value={newEvent.title || ''}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              />
            </div>
            
            {/* Start Date Field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start" className="text-right">Start</Label>
              <Input
                id="start"
                type="datetime-local"
                className="col-span-3"
                value={newEvent.start ? moment(newEvent.start).format('YYYY-MM-DDTHH:mm') : ''}
                onChange={(e) => setNewEvent({ ...newEvent, start: new Date(e.target.value) })}
              />
            </div>
            
            {/* End Date Field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="end" className="text-right">End</Label>
              <Input
                id="end"
                type="datetime-local"
                className="col-span-3"
                value={newEvent.end ? moment(newEvent.end).format('YYYY-MM-DDTHH:mm') : ''}
                onChange={(e) => setNewEvent({ ...newEvent, end: new Date(e.target.value) })}
              />
            </div>

            {/* Type Field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">Type</Label>
              <Select onValueChange={(value) => setNewEvent({ ...newEvent, type: value as Event['type'] })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {['post', 'birthday', 'anniversary', 'eatout', 'meeting', 'worlddates', 'holiday', 'study', 'hobby', 'payment'].map(type => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center">
                        {getEventTypeIcon(type as Event['type'])}
                        <span className="ml-2">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">Category</Label>
              <Select onValueChange={(value) => setNewEvent({ ...newEvent, category: value as EventCategory })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {personalCalendars.map((calendar) => (
                    <SelectItem key={calendar.id} value={calendar.name.toLowerCase()}>
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: calendar.color }}></div>
                        {calendar.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location Field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">Location</Label>
              <Input
                id="location"
                className="col-span-3"
                value={newEvent.location || ''}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
              />
            </div>

            {/* Description Field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Textarea
                id="description"
                className="col-span-3"
                value={newEvent.description || ''}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              />
            </div>

            {/* Tags Field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tags" className="text-right">Tags</Label>
              <div className="col-span-3 flex flex-wrap gap-2">
                {newEvent.tags?.map((tag, index) => (
                  <div key={index} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
                    {tag}
                    <button 
                      onClick={() => setNewEvent({ 
                        ...newEvent, 
                        tags: newEvent.tags?.filter((_, i) => i !== index) 
                      })}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <Input
                  id="tags"
                  placeholder="Add a tag"
                  className="flex-grow"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim() !== '') {
                      e.preventDefault();
                      const newTag = e.currentTarget.value.trim();
                      setNewEvent({
                        ...newEvent,
                        tags: [...(newEvent.tags || []), newTag]
                      });
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            </div>

            {/* Recurring Event Switch */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="recurring" className="text-right">Recurring</Label>
              <Switch
                id="recurring"
                checked={newEvent.isRecurring || false}
                onCheckedChange={(checked) => setNewEvent({ ...newEvent, isRecurring: checked })}
              />
            </div>

            {/* Recurrence Pattern */}
            {newEvent.isRecurring && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="recurrence" className="text-right">Recurrence</Label>
                <Select onValueChange={(value) => setNewEvent({ ...newEvent, recurrencePattern: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select recurrence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Reminder Field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reminder" className="text-right">Reminder</Label>
              <Select onValueChange={(value) => setNewEvent({ ...newEvent, reminder: parseInt(value) })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Set reminder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No reminder</SelectItem>
                  <SelectItem value="5">5 minutes before</SelectItem>
                  <SelectItem value="15">15 minutes before</SelectItem>
                  <SelectItem value="30">30 minutes before</SelectItem>
                  <SelectItem value="60">1 hour before</SelectItem>
                  <SelectItem value="1440">1 day before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <div>
              {newEvent.id && (
                <Button variant="destructive" onClick={handleDeleteEvent} className="mr-2">
                  Delete
                </Button>
              )}
              <Button variant="outline" onClick={() => setIsAddEventDialogOpen(false)}>
                Cancel
              </Button>
            </div>
            <Button type="submit" onClick={handleAddOrUpdateEvent}>
              {newEvent.id ? "Update Event" : "Add Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}