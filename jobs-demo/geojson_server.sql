
do
$$
DECLARE
  test_count integer;
  test_mincount integer = 300000;
  test_md5_current text;
  test_md5_previous text;

BEGIN

  -- create server connection
  CREATE SERVER IF NOT EXISTS fdw_cqwneik
	FOREIGN DATA WRAPPER ogr_fdw
	OPTIONS (datasource 'GeoJSON:http://192.168.29.254:3000/data/tax_parcels.geojson', format 'GeoJSON' );


  -- create foreign table
  CREATE FOREIGN TABLE IF NOT EXISTS fdt_cqwneik
	(
    pid varchar,
    geom Geometry(Geometry, 2264)
	) SERVER "fdw_cqwneik" OPTIONS (layer 'tax_parcels');


  -- test row count
  SELECT
    count(*) into test_count
  FROM
    fdt_cqwneik;

  IF test_count < test_mincount THEN
    raise exception 'error: minimum row count failure';
  END IF;


  -- test table change
  SELECT COALESCE(obj_description('test_etl'::regclass), '') into test_md5_previous;

  SELECT
    md5(CAST((array_agg(t.*)) AS text)) into test_md5_current
  FROM
    (
      SELECT *
      FROM fdt_cqwneik
      ORDER BY 1
    ) AS t;

  IF test_md5_current = test_md5_previous THEN
    raise exception 'no change found';
  END IF;


  -- run update
	TRUNCATE TABLE test_etl RESTART IDENTITY;

  INSERT INTO test_etl
    (
      pid, geom
    )
  SELECT
    pid, geom
  FROM
    fdt_cqwneik;

  EXECUTE 'COMMENT ON TABLE test_etl IS ' || quote_literal(test_md5_current);


  -- remove server and foreign table
  DROP SERVER IF EXISTS fdw_cqwneik CASCADE;

END;
$$ LANGUAGE plpgsql;
