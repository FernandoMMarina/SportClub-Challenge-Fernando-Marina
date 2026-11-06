import { create } from 'zustand';

type PendingVenueState = {
  venueId: string | null;
  setVenue: (venueId: string | null) => void;
};

// Only the validated destination is kept while the user signs in.
export const usePendingVenueStore = create<PendingVenueState>((set) => ({
  venueId: null,
  setVenue: (venueId) => set({ venueId }),
}));
