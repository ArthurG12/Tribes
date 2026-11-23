ALTER TABLE tribe_events
  ADD COLUMN location_lat DOUBLE PRECISION,
  ADD COLUMN location_lon DOUBLE PRECISION,
  ADD CONSTRAINT tribe_events_location_coordinates_valid
    CHECK (
      (location_lat IS NULL AND location_lon IS NULL)
      OR (
        location_lat IS NOT NULL AND location_lon IS NOT NULL
        AND location_lat BETWEEN -90 AND 90
        AND location_lon BETWEEN -180 AND 180
      )
    );
