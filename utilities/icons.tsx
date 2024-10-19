import React from 'react';
import { MessageSquare, Cake, Gift, CalendarIcon, Users, Home, Briefcase, MoreHorizontal } from 'lucide-react';
import { Event, EventCategory } from '../types'; // Adjust the import path as needed

export const getEventTypeIcon = (type: Event['type']) => {
  switch(type) {
    case 'post': return <MessageSquare className="inline-block mr-2" size={16} />;
    case 'birthday': return <Cake className="inline-block mr-2" size={16} />;
    case 'anniversary': return <Gift className="inline-block mr-2" size={16} />;
    // Add other cases as needed
    default: return <CalendarIcon className="inline-block mr-2" size={16} />;
  }
};

export const getCategoryIcon = (category: EventCategory) => {
  switch(category) {
    case 'personal': return <Users className="inline-block mr-2" size={16} />;
    case 'family': return <Home className="inline-block mr-2" size={16} />;
    case 'work': return <Briefcase className="inline-block mr-2" size={16} />;
    // Add other cases as needed
    default: return <MoreHorizontal className="inline-block mr-2" size={16} />;
  }
};
