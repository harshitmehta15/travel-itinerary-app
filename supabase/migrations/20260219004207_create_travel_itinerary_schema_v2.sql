/*
  # Travel Itinerary App Schema

  ## Overview
  This migration creates the database schema for a collaborative travel itinerary application.

  ## New Tables
  
  ### `profiles`
  Table for storing user profile information
  - `id` (uuid, primary key) - References auth.users
  - `email` (text) - User email
  - `display_name` (text) - User display name
  - `created_at` (timestamptz) - Creation timestamp

  ### `itineraries`
  Main table for storing travel itineraries
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Name of the itinerary
  - `description` (text) - Description of the trip
  - `destination` (text) - Primary destination
  - `start_date` (date) - Trip start date
  - `end_date` (date) - Trip end date
  - `created_by` (uuid) - Reference to auth.users
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `collaborators`
  Table for managing itinerary collaborators
  - `id` (uuid, primary key) - Unique identifier
  - `itinerary_id` (uuid) - Foreign key to itineraries
  - `user_id` (uuid) - Reference to auth.users
  - `role` (text) - Collaborator role (owner, editor, viewer)
  - `added_at` (timestamptz) - When collaborator was added

  ### `activities`
  Table for storing activities within itineraries
  - `id` (uuid, primary key) - Unique identifier
  - `itinerary_id` (uuid) - Foreign key to itineraries
  - `title` (text) - Activity title
  - `description` (text) - Activity description
  - `date` (date) - Activity date
  - `start_time` (time) - Start time
  - `end_time` (time) - End time
  - `location` (text) - Activity location
  - `category` (text) - Category (e.g., food, sightseeing, accommodation)
  - `created_by` (uuid) - Reference to auth.users
  - `created_at` (timestamptz) - Creation timestamp
  - `order_index` (integer) - For ordering activities

  ## Security
  All tables have Row Level Security (RLS) enabled with appropriate policies:
  - Users can view itineraries they own or are collaborators on
  - Users can edit itineraries based on their role
  - Users can manage activities in itineraries they have access to
  - Only owners can manage collaborators
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create itineraries table
CREATE TABLE IF NOT EXISTS itineraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  destination text DEFAULT '',
  start_date date,
  end_date date,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create collaborators table
CREATE TABLE IF NOT EXISTS collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id uuid REFERENCES itineraries(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  added_at timestamptz DEFAULT now(),
  UNIQUE(itinerary_id, user_id)
);

-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id uuid REFERENCES itineraries(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  date date,
  start_time time,
  end_time time,
  location text DEFAULT '',
  category text DEFAULT 'other',
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  order_index integer DEFAULT 0
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Itineraries policies
CREATE POLICY "Users can view itineraries they own or collaborate on"
  ON itineraries FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM collaborators
      WHERE collaborators.itinerary_id = itineraries.id
      AND collaborators.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own itineraries"
  ON itineraries FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update itineraries they own or have editor access"
  ON itineraries FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM collaborators
      WHERE collaborators.itinerary_id = itineraries.id
      AND collaborators.user_id = auth.uid()
      AND collaborators.role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM collaborators
      WHERE collaborators.itinerary_id = itineraries.id
      AND collaborators.user_id = auth.uid()
      AND collaborators.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Users can delete itineraries they own"
  ON itineraries FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Collaborators policies
CREATE POLICY "Users can view collaborators on accessible itineraries"
  ON collaborators FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = collaborators.itinerary_id
      AND (
        itineraries.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM collaborators c
          WHERE c.itinerary_id = itineraries.id
          AND c.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Itinerary owners can add collaborators"
  ON collaborators FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = collaborators.itinerary_id
      AND itineraries.created_by = auth.uid()
    )
  );

CREATE POLICY "Itinerary owners can remove collaborators"
  ON collaborators FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = collaborators.itinerary_id
      AND itineraries.created_by = auth.uid()
    )
  );

CREATE POLICY "Itinerary owners can update collaborator roles"
  ON collaborators FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = collaborators.itinerary_id
      AND itineraries.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = collaborators.itinerary_id
      AND itineraries.created_by = auth.uid()
    )
  );

-- Activities policies
CREATE POLICY "Users can view activities in accessible itineraries"
  ON activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = activities.itinerary_id
      AND (
        itineraries.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM collaborators
          WHERE collaborators.itinerary_id = itineraries.id
          AND collaborators.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can insert activities in editable itineraries"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = activities.itinerary_id
      AND (
        itineraries.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM collaborators
          WHERE collaborators.itinerary_id = itineraries.id
          AND collaborators.user_id = auth.uid()
          AND collaborators.role IN ('owner', 'editor')
        )
      )
    )
  );

CREATE POLICY "Users can update activities in editable itineraries"
  ON activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = activities.itinerary_id
      AND (
        itineraries.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM collaborators
          WHERE collaborators.itinerary_id = itineraries.id
          AND collaborators.user_id = auth.uid()
          AND collaborators.role IN ('owner', 'editor')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = activities.itinerary_id
      AND (
        itineraries.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM collaborators
          WHERE collaborators.itinerary_id = itineraries.id
          AND collaborators.user_id = auth.uid()
          AND collaborators.role IN ('owner', 'editor')
        )
      )
    )
  );

CREATE POLICY "Users can delete activities in editable itineraries"
  ON activities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = activities.itinerary_id
      AND (
        itineraries.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM collaborators
          WHERE collaborators.itinerary_id = itineraries.id
          AND collaborators.user_id = auth.uid()
          AND collaborators.role IN ('owner', 'editor')
        )
      )
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_activities_itinerary_id ON activities(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
CREATE INDEX IF NOT EXISTS idx_collaborators_itinerary_id ON collaborators(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user_id ON collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_created_by ON itineraries(created_by);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for itineraries updated_at
DROP TRIGGER IF EXISTS update_itineraries_updated_at ON itineraries;
CREATE TRIGGER update_itineraries_updated_at
  BEFORE UPDATE ON itineraries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();