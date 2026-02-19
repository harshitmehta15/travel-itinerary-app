/*
  # Fix Security and Performance Issues

  ## Performance Optimizations
  
  1. **Add Missing Indexes on Foreign Keys**
     - `activities.created_by` (foreign key to auth.users)
     - This prevents suboptimal query performance on joins

  2. **Optimize RLS Policies**
     - Replace `auth.uid()` calls with `(select auth.uid())`
     - This prevents re-evaluation for each row
     - See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

  3. **Remove Unused Indexes**
     - Indexes on `activities.itinerary_id`, `activities.date`
     - Indexes on `collaborators.itinerary_id`, `collaborators.user_id`
     - Index on `itineraries.created_by`
     - These were not being used by the query planner

  4. **Fix Function Search Path**
     - Set `search_path` to immutable in `update_updated_at_column`
     - Improves security and performance
*/

-- Add missing indexes on foreign keys
CREATE INDEX IF NOT EXISTS idx_activities_created_by ON activities(created_by);

-- Drop unused indexes
DROP INDEX IF EXISTS idx_activities_itinerary_id;
DROP INDEX IF EXISTS idx_activities_date;
DROP INDEX IF EXISTS idx_collaborators_itinerary_id;
DROP INDEX IF EXISTS idx_collaborators_user_id;
DROP INDEX IF EXISTS idx_itineraries_created_by;

-- Drop existing policies and recreate with optimized auth calls
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = (select auth.uid()))
  WITH CHECK (auth.uid() = (select auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = (select auth.uid()));

-- Itineraries policies
DROP POLICY IF EXISTS "Users can view itineraries they own or collaborate on" ON itineraries;
DROP POLICY IF EXISTS "Users can insert own itineraries" ON itineraries;
DROP POLICY IF EXISTS "Users can update itineraries they own or have editor access" ON itineraries;
DROP POLICY IF EXISTS "Users can delete itineraries they own" ON itineraries;

CREATE POLICY "Users can view itineraries they own or collaborate on"
  ON itineraries FOR SELECT
  TO authenticated
  USING (
    created_by = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM collaborators
      WHERE collaborators.itinerary_id = itineraries.id
      AND collaborators.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own itineraries"
  ON itineraries FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Users can update itineraries they own or have editor access"
  ON itineraries FOR UPDATE
  TO authenticated
  USING (
    created_by = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM collaborators
      WHERE collaborators.itinerary_id = itineraries.id
      AND collaborators.user_id = (select auth.uid())
      AND collaborators.role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    created_by = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM collaborators
      WHERE collaborators.itinerary_id = itineraries.id
      AND collaborators.user_id = (select auth.uid())
      AND collaborators.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Users can delete itineraries they own"
  ON itineraries FOR DELETE
  TO authenticated
  USING (created_by = (select auth.uid()));

-- Collaborators policies
DROP POLICY IF EXISTS "Users can view collaborators on accessible itineraries" ON collaborators;
DROP POLICY IF EXISTS "Itinerary owners can add collaborators" ON collaborators;
DROP POLICY IF EXISTS "Itinerary owners can remove collaborators" ON collaborators;
DROP POLICY IF EXISTS "Itinerary owners can update collaborator roles" ON collaborators;

CREATE POLICY "Users can view collaborators on accessible itineraries"
  ON collaborators FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = collaborators.itinerary_id
      AND (
        itineraries.created_by = (select auth.uid()) OR
        EXISTS (
          SELECT 1 FROM collaborators c
          WHERE c.itinerary_id = itineraries.id
          AND c.user_id = (select auth.uid())
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
      AND itineraries.created_by = (select auth.uid())
    )
  );

CREATE POLICY "Itinerary owners can remove collaborators"
  ON collaborators FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = collaborators.itinerary_id
      AND itineraries.created_by = (select auth.uid())
    )
  );

CREATE POLICY "Itinerary owners can update collaborator roles"
  ON collaborators FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = collaborators.itinerary_id
      AND itineraries.created_by = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = collaborators.itinerary_id
      AND itineraries.created_by = (select auth.uid())
    )
  );

-- Activities policies
DROP POLICY IF EXISTS "Users can view activities in accessible itineraries" ON activities;
DROP POLICY IF EXISTS "Users can insert activities in editable itineraries" ON activities;
DROP POLICY IF EXISTS "Users can update activities in editable itineraries" ON activities;
DROP POLICY IF EXISTS "Users can delete activities in editable itineraries" ON activities;

CREATE POLICY "Users can view activities in accessible itineraries"
  ON activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = activities.itinerary_id
      AND (
        itineraries.created_by = (select auth.uid()) OR
        EXISTS (
          SELECT 1 FROM collaborators
          WHERE collaborators.itinerary_id = itineraries.id
          AND collaborators.user_id = (select auth.uid())
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
        itineraries.created_by = (select auth.uid()) OR
        EXISTS (
          SELECT 1 FROM collaborators
          WHERE collaborators.itinerary_id = activities.itinerary_id
          AND collaborators.user_id = (select auth.uid())
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
        itineraries.created_by = (select auth.uid()) OR
        EXISTS (
          SELECT 1 FROM collaborators
          WHERE collaborators.itinerary_id = itineraries.id
          AND collaborators.user_id = (select auth.uid())
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
        itineraries.created_by = (select auth.uid()) OR
        EXISTS (
          SELECT 1 FROM collaborators
          WHERE collaborators.itinerary_id = itineraries.id
          AND collaborators.user_id = (select auth.uid())
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
        itineraries.created_by = (select auth.uid()) OR
        EXISTS (
          SELECT 1 FROM collaborators
          WHERE collaborators.itinerary_id = itineraries.id
          AND collaborators.user_id = (select auth.uid())
          AND collaborators.role IN ('owner', 'editor')
        )
      )
    )
  );

-- Fix function search path to be immutable
DROP TRIGGER IF EXISTS update_itineraries_updated_at ON itineraries;
DROP FUNCTION IF EXISTS update_updated_at_column();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Recreate trigger
CREATE TRIGGER update_itineraries_updated_at
  BEFORE UPDATE ON itineraries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();