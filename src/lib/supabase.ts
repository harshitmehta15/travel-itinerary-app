import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string;
          created_at?: string;
        };
      };
      itineraries: {
        Row: {
          id: string;
          name: string;
          description: string;
          destination: string;
          start_date: string | null;
          end_date: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          destination?: string;
          start_date?: string | null;
          end_date?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          destination?: string;
          start_date?: string | null;
          end_date?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      activities: {
        Row: {
          id: string;
          itinerary_id: string;
          title: string;
          description: string;
          date: string | null;
          start_time: string | null;
          end_time: string | null;
          location: string;
          category: string;
          created_by: string;
          created_at: string;
          order_index: number;
        };
        Insert: {
          id?: string;
          itinerary_id: string;
          title: string;
          description?: string;
          date?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          location?: string;
          category?: string;
          created_by: string;
          created_at?: string;
          order_index?: number;
        };
        Update: {
          id?: string;
          itinerary_id?: string;
          title?: string;
          description?: string;
          date?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          location?: string;
          category?: string;
          created_by?: string;
          created_at?: string;
          order_index?: number;
        };
      };
      collaborators: {
        Row: {
          id: string;
          itinerary_id: string;
          user_id: string;
          role: string;
          added_at: string;
        };
        Insert: {
          id?: string;
          itinerary_id: string;
          user_id: string;
          role?: string;
          added_at?: string;
        };
        Update: {
          id?: string;
          itinerary_id?: string;
          user_id?: string;
          role?: string;
          added_at?: string;
        };
      };
    };
  };
};
