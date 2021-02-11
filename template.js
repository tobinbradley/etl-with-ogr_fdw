const fs = require("fs");
const path = require("path")
const source = process.argv[2]
const destination = process.argv[3]
const count = process.argv[4]
const filename = process.argv[5]
const rndString = Math.random().toString(36).substring(5)

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
  CREATE SERVER IF NOT EXISTS fdw_${rndString}
	FOREIGN DATA WRAPPER ogr_fdw
	OPTIONS (datasource 'Pg:dbname= user= host= password=', format 'PostgreSQL' );


  -- create foreign table
  CREATE FOREIGN fdt_${rndString}
	(

	) SERVER "fdw_${rndString}" OPTIONS (layer '${source}');


  -- test row count
  SELECT
    count(*) into test_count
  FROM
    fdt_${rndString};

  IF test_count >= test_mincount THEN
    raise exception 'error: minimum row count failure';
  END IF;


  -- test table change
  SELECT COALESCE(obj_description('${destination}'::regclass), '') into test_md5_previous;

  SELECT
    md5(CAST((array_agg(t.*)) AS text)) into test_md5_current
  FROM
    (
      SELECT *
      FROM fdt_${rndString}
      ORDER BY 1
    ) AS t;

  IF test_md5_current <> test_md5_previous THEN
    raise exception 'no change found';
  END IF;


  -- run update
	TRUNCATE TABLE ${destination} RESTART IDENTITY;

  INSERT INTO ${destination}
    (

    )
  SELECT

  FROM
    fdt_${rndString};

  EXECUTE 'COMMENT ON TABLE ${destination} IS ' || quote_literal(test_md5_current);


  -- remove server and foreign table
  DROP SERVER IF EXISTS fdw_${rndString} CASCADE;

END;
$$ LANGUAGE plpgsql;
`

fs.writeFile(path.join("jobs", filename), template, { flag: 'wx' }, function(err) {
  if(err) {
    return console.log(err)
  }
  console.log(`${filename} saved!`);
});
