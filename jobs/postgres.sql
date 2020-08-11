do
$$
DECLARE
	test_count integer;
	test_mincount integer = 180;
  test_md5_source text;
  test_md5_destination text;

BEGIN
  -- create server connection
	CREATE SERVER IF NOT EXISTS ogr_fdw_reacharound
	FOREIGN DATA WRAPPER ogr_fdw
	OPTIONS (datasource 'Pg:dbname=gis user=postgres', format 'PostgreSQL' );

  -- create foreign table
	CREATE FOREIGN TABLE IF NOT EXISTS ogr_fdw_reacharound_polling_locations
	(
		id integer,
		geom geometry(Point,2264),
		precno double precision,
		name character varying(80),
		city character varying(20),
		zone double precision,
		address character varying(31),
		type character varying(50),
		location character varying(254)
	) SERVER "ogr_fdw_reacharound"
	OPTIONS (layer 'polling_locations');

  -- set test criteria
	SELECT
    count(*) into test_count
  FROM
    ogr_fdw_reacharound_polling_locations;

  SELECT
    md5(CAST((array_agg(t.*)) AS text)) into test_md5_destination
  FROM
    (
      SELECT name, precno, geom
      FROM polling_locations
      ORDER BY 1
    ) AS t;

  SELECT
    md5(CAST((array_agg(t.*)) AS text)) into test_md5_source
  FROM
    (
      SELECT name, precno, geom
      FROM ogr_fdw_reacharound_polling_locations
      ORDER BY 1
    ) AS t;

  -- run update if tests passed
  IF test_count >= test_mincount THEN
		IF test_md5_source <> test_md5_destination THEN
			-- TRUNCATE TABLE polling_locations RESTART IDENTITY;
			INSERT INTO polling_locations
				(geom, precno, name, city, zone, address, type, location)
			SELECT
				geom, precno, name, city, zone, address, type, location
			FROM
				ogr_fdw_reacharound_polling_locations;
		ELSE
			raise exception 'no change found';
		END IF;
	ELSE
		raise exception 'minimum row count failure';
	END IF;

  -- remove server and foreign table
  DROP SERVER IF EXISTS ogr_fdw_reacharound CASCADE;

END;
$$ LANGUAGE plpgsql;