import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  EventConfig,
  EventConfigCreateData,
  EventConfigUpdateData,
  createEventConfigApi,
  getActiveEventConfigsApi,
  getAllEventConfigsApi,
  updateEventConfigApi,
  deleteEventConfigApi,
} from '../api/eventConfigApi';

interface EventConfigStore {
  // State
  events: EventConfig[];
  selectedEvent: EventConfig | null;
  loading: boolean;
  error: string | null;

  // Actions
  setEvents: (events: EventConfig[]) => void;
  setSelectedEvent: (event: EventConfig | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // API Actions
  fetchActiveEvents: () => Promise<void>;
  fetchAllEvents: () => Promise<void>;
  createEvent: (eventData: EventConfigCreateData) => Promise<EventConfig | null>;
  updateEvent: (
    eventId: string,
    updateData: EventConfigUpdateData
  ) => Promise<EventConfig | null>;
  deleteEvent: (eventId: string, hardDelete?: boolean) => Promise<boolean>;
  
  // Utility Actions
  getEventById: (eventId: string) => EventConfig | undefined;
  refreshEvents: () => Promise<void>;
  resetStore: () => void;
}

const initialState = {
  events: [],
  selectedEvent: null,
  loading: false,
  error: null,
};

export const useEventConfigStore = create<EventConfigStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Setters
      setEvents: (events) => set({ events }),
      setSelectedEvent: (event) => set({ selectedEvent: event }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // API Actions
      fetchActiveEvents: async () => {
        set({ loading: true, error: null });
        try {
          const events = await getActiveEventConfigsApi();
          set({
            events: events,
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch active events',
            loading: false,
          });
        }
      },

      fetchAllEvents: async () => {
        set({ loading: true, error: null });
        try {
          const events = await getAllEventConfigsApi();
          set({
            events: events,
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch events',
            loading: false,
          });
        }
      },

      createEvent: async (eventData) => {
        set({ loading: true, error: null });
        try {
          const newEvent = await createEventConfigApi(eventData);

          // Add to events list
          const currentEvents = get().events;
          const updatedEvents = [...currentEvents, newEvent].sort((a, b) => 
            a.name.localeCompare(b.name)
          );

          set({
            events: updatedEvents,
            loading: false,
          });

          return newEvent;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create event',
            loading: false,
          });
          return null;
        }
      },

      updateEvent: async (eventId, updateData) => {
        set({ loading: true, error: null });
        try {
          const updatedEvent = await updateEventConfigApi(eventId, updateData);

          // Update in events list
          const currentEvents = get().events;
          const updatedEvents = currentEvents
            .map((event) => (event._id === eventId ? updatedEvent : event))
            .sort((a, b) => a.name.localeCompare(b.name));

          set({
            events: updatedEvents,
            selectedEvent:
              get().selectedEvent?._id === eventId ? updatedEvent : get().selectedEvent,
            loading: false,
          });

          return updatedEvent;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update event',
            loading: false,
          });
          return null;
        }
      },

      deleteEvent: async (eventId, _hardDelete = false) => {
        set({ loading: true, error: null });
        try {
          // Backend now always hard-deletes events; ignore hardDelete flag
          await deleteEventConfigApi(eventId, true);

          // Remove from events list locally
          const currentEvents = get().events;
          const filteredEvents = currentEvents.filter((event) => event._id !== eventId);
          set({
            events: filteredEvents,
            selectedEvent: get().selectedEvent?._id === eventId ? null : get().selectedEvent,
            loading: false,
          });

          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete event',
            loading: false,
          });
          return false;
        }
      },

      // Utility Actions
      getEventById: (eventId) => {
        return get().events.find((event) => event._id === eventId);
      },

      refreshEvents: async () => {
        await get().fetchAllEvents();
      },

      resetStore: () => {
        set(initialState);
      },
    }),
    {
      name: 'event-config-store',
    }
  )
);

