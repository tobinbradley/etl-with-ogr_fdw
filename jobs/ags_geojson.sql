do
$$
DECLARE
	test_count integer;
	test_mincount integer = 100;

BEGIN
  -- create server connection
	CREATE SERVER IF NOT EXISTS ogr_fdw_ags
  FOREIGN DATA WRAPPER ogr_fdw
  OPTIONS (
	datasource 'GeoJSON:https://services.arcgis.com/iFBq2AW9XO0jYYF7/ArcGIS/rest/services/NCCovid19/FeatureServer/0/query?where=1=1&outfields=OBJECTID,CONAME,County,Total,Deaths,Hosp,Rate10K&f=geoJSON',
	format 'GeoJSON' );

  -- create foreign table
	CREATE FOREIGN TABLE IF NOT EXISTS ogr_fdw_ags_covid (
    objectid bigint,
    geom Geometry(Geometry,4326),
    CONAME varchar,
    total float,
    deaths float,
    rate10k float
  ) SERVER "ogr_fdw_ags"
  OPTIONS (layer 'OGRGeoJSON');

  -- set test criteria
	SELECT
    count(*) into test_count
  FROM
    ogr_fdw_ags_covid;


  -- run update if tests passed
  IF test_count >= test_mincount THEN
    TRUNCATE TABLE covid RESTART IDENTITY;
    INSERT INTO covid
      (geom, coname, total, deaths, rate10k)
    SELECT
      geom, coname, total, deaths, rate10k
    FROM
      ogr_fdw_ags_covid;
	ELSE
		raise exception 'minimum row count failure';
	END IF;

  -- remove server and foreign table
  DROP SERVER IF EXISTS ogr_fdw_ags CASCADE;

END;
$$ LANGUAGE plpgsql;