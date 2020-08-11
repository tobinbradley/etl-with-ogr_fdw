do
$$
DECLARE
	test_count integer;
	test_mincount integer = 180;

BEGIN
  -- create server connection
	CREATE SERVER ogr_fdw_shapefile
  FOREIGN DATA WRAPPER ogr_fdw
  OPTIONS (
    datasource '/opt/etl-data',
    format 'ESRI Shapefile' );

  -- create foreign table
	CREATE FOREIGN TABLE IF NOT EXISTS ogr_fdw_shapefile_polling_locations
	(
		geom geometry(Point,2264),
		precno double precision,
		name character varying(80),
		city character varying(20),
		zone double precision,
		address character varying(31),
		type character varying(50),
		location character varying(254)
	) SERVER "ogr_fdw_shapefile"
	OPTIONS (layer 'Voter_Polling_Location');

  -- set test criteria
	SELECT
    count(*) into test_count
  FROM
    ogr_fdw_shapefile_polling_locations;


  -- run update if tests passed
  IF test_count >= test_mincount THEN
    TRUNCATE TABLE polling_locations RESTART IDENTITY;
    INSERT INTO polling_locations
				(geom, precno, name, city, zone, address, type, location)
			SELECT
				geom, precno, name, city, zone, address, type, location
			FROM
				ogr_fdw_shapefile_polling_locations;
	ELSE
		raise exception 'minimum row count failure';
	END IF;

  -- remove server and foreign table
  DROP SERVER IF EXISTS ogr_fdw_shapefile CASCADE;

END;
$$ LANGUAGE plpgsql;