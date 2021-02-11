do
$$
DECLARE
	test_count integer;
	test_mincount integer = 180;

BEGIN
  -- create server connection
	CREATE SERVER IF NOT EXISTS ogr_fdw_geoserver
  FOREIGN DATA WRAPPER ogr_fdw
  OPTIONS (
    datasource 'WFS:http://maps.co.mecklenburg.nc.us/geoserver/wfs',
    format 'WFS' );

  -- create foreign table
	CREATE FOREIGN TABLE IF NOT EXISTS ogr_fdw_geoserver_voting_precincts
	(
		geom geometry(MultiPolygon,2264),
		precno double precision,
		cc double precision,
		school double precision,
		jud character varying,
		zone double precision
	) SERVER "ogr_fdw_geoserver"
	OPTIONS (layer 'postgis:voting_precincts');

  -- set test criteria
	SELECT
    count(*) into test_count
  FROM
    ogr_fdw_geoserver_voting_precincts;

  -- run update if tests passed
  IF test_count >= test_mincount THEN
    TRUNCATE TABLE voter_precincts RESTART IDENTITY;
    INSERT INTO voter_precincts
      (geom, precno, cc, school, jud, zone)
    SELECT
      geom, precno, cc, school, jud, zone
    FROM
      ogr_fdw_geoserver_voting_precincts;
	ELSE
		raise exception 'minimum row count failure';
	END IF;

  -- remove server and foreign table
  DROP SERVER IF EXISTS ogr_fdw_geoserver CASCADE;

END;
$$ LANGUAGE plpgsql;
