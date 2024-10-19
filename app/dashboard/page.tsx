import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Switch, Link, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

// Initial Calendar Setup (Work and Family)
const initialCalendars = [
  { id: uuidv4(), name: 'Work', color: '#4CAF50', events: [], isShareable: true },
  { id: uuidv4(), name: 'Family', color: '#FF9800', events: [], isShareable: true },
  { id: uuidv4(), name: 'Personal', color: '#2196F3', events: [], isShareable: false } // Personal is locked
];

function App() {
  const [calendars, setCalendars] = useState(initialCalendars);
  const [selectedCalendar, setSelectedCalendar] = useState(calendars[0]);
  const [events, setEvents] = useState([]);

  // Add new calendar
  const handleAddCalendar = () => {
    if (calendars.length >= 5) {
      alert('Max limit reached. Please upgrade to add more calendars.');
      return;
    }
    const newCalendar = {
      id: uuidv4(),
      name: prompt('Enter calendar name:'),
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      events: [],
      isShareable: true
    };
    setCalendars([...calendars, newCalendar]);
  };

  // Add new event
  const handleAddEvent = (calendarId) => {
    const title = prompt('Enter event title:');
    const start = new Date(prompt('Enter start date (YYYY-MM-DD HH:mm):'));
    const end = new Date(prompt('Enter end date (YYYY-MM-DD HH:mm):'));

    const newEvent = {
      id: uuidv4(),
      title,
      start,
      end,
      calendarId
    };
    setEvents([...events, newEvent]);
  };

  // Delete event
  const handleDeleteEvent = (eventId) => {
    setEvents(events.filter(event => event.id !== eventId));
  };

  // Get events for the selected calendar
  const filteredEvents = events.filter(event => event.calendarId === selectedCalendar.id);

  return (
    <Router>
      <div>
        <h1>My Calendar App</h1>
        <button onClick={handleAddCalendar}>Add New Calendar</button>

        <h2>Calendars</h2>
        <ul>
          {calendars.map(calendar => (
            <li key={calendar.id}>
              <Link to={`/calendar/${calendar.id}`}>
                {calendar.name} (Shareable: {calendar.isShareable ? 'Yes' : 'No'})
              </Link>
            </li>
          ))}
        </ul>

        {/* Calendar Component */}
        <Switch>
          <Route path="/calendar/:calendarId">
            <CalendarView
              events={filteredEvents}
              handleAddEvent={handleAddEvent}
              handleDeleteEvent={handleDeleteEvent}
            />
          </Route>

          {/* Shared Calendar */}
          <Route path="/shared-calendar/:calendarId">
            <SharedCalendarView events={events} calendars={calendars} />
          </Route>
        </Switch>
      </div>
    </Router>
  );
}
