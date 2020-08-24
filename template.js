const fs = require("fs");
const path = require("path")
const source = process.argv[2]
const destination = process.argv[3]
const count = process.argv[4]
const filename = process.argv[5]

const template = `
do
$$
DECLARE
  test_count integer;
  test_mincount integer = ${count};
  test_md5_current text;
  test_md5_previous text;

BEGIN

  -- create server connection
  CREATE SERVER IF NOT EXISTS ogr_fdw_db
	FOREIGN DATA WRAPPER ogr_fdw
	OPTIONS (datasource 'Pg:dbname= user= host= password=', format 'PostgreSQL' );


  -- create foreign table
  CREATE FOREIGN TABLE IF NOT EXISTS ogr_fdw_source
	(

	) SERVER "ogr_fdw_db" OPTIONS (layer '${source}');


  -- set test criteria
  SELECT
    count(*) into test_count
  FROM
    ogr_fdw_source;

  SELECT COALESCE(obj_description('${destination}'::regclass), '') into test_md5_previous;

  SELECT
    md5(CAST((array_agg(t.*)) AS text)) into test_md5_current
  FROM
    (
      SELECT *
      FROM ogr_fdw_source
      ORDER BY 1
    ) AS t;

  -- run update if tests passed
  IF test_count >= test_mincount THEN
	IF test_md5_current <> test_md5_previous THEN
	  TRUNCATE TABLE ${destination} RESTART IDENTITY;

      INSERT INTO ${destination}
        (

        )
        SELECT

        FROM
          ogr_fdw_source;

	  EXECUTE 'COMMENT ON TABLE ${destination} IS ' || quote_literal(test_md5_current);
	ELSE
	  raise exception 'no change found';
	END IF;
  ELSE
	raise exception 'error: minimum row count failure';
  END IF;

  -- remove server and foreign table
  DROP SERVER IF EXISTS ogr_fdw_db CASCADE;

END;
$$ LANGUAGE plpgsql;
`

fs.writeFile(path.join("jobs", filename), template, function(err) {
  if(err) {
    return console.log(err)
  }
  console.log(`${filename} saved!`);
});