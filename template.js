const fs = require("fs");
const path = require("path")
const sourceType = process.argv[2]
const source = process.argv[3]
const destination = process.argv[4]
const count = process.argv[5]
const filename = process.argv[6]
const rndString = Math.random().toString(36).substring(5)

let sourceString = ''

if (sourceType === "mssql") {
  sourceString = `
  -- create server connection
  CREATE SERVER IF NOT EXISTS fdw_${rndString}
	FOREIGN DATA WRAPPER tds_fdw
	OPTIONS (servername '', database '');

  -- create user mapping
  CREATE USER MAPPING FOR local_user
  SERVER fdw_${rndString}
  OPTIONS (username '', password '');

  -- create foreign table
  CREATE FOREIGN TABLE IF NOT EXISTS fdt_${rndString}
	(
    -- insert foreign table column mappings here
	)
  SERVER "fdw_${rndString}"
  OPTIONS (table_name '${source}');
  `
}

if (sourceType === "pg") {
  sourceString = `
  -- create server connection
  CREATE SERVER IF NOT EXISTS fdw_${rndString}
	FOREIGN DATA WRAPPER postgres_fdw
	OPTIONS (host '', dbname '');

  -- create user mapping
  CREATE USER MAPPING FOR local_user
  SERVER fdw_${rndString}
  OPTIONS (user '', password '');

  -- create foreign table
  CREATE FOREIGN TABLE IF NOT EXISTS fdt_${rndString}
	(
    -- insert foreign table column mappings here
	)
  SERVER "fdw_${rndString}"
  OPTIONS (schema_name 'public', table_name '${source}');
  `
}

if (sourceType === 'ogr'){
  sourceString = `
  -- create server connection
  CREATE SERVER IF NOT EXISTS fdw_${rndString}
	FOREIGN DATA WRAPPER ogr_fdw
	OPTIONS (datasource 'Pg:dbname= user= host= password=', format 'PostgreSQL' );


  -- create foreign table
  CREATE FOREIGN TABLE IF NOT EXISTS fdt_${rndString}
	(
    -- insert foreign table column mappings here
	) SERVER "fdw_${rndString}" OPTIONS (layer '${source}');
  `
}

const template = `
do
$$
DECLARE
  test_count integer;
  test_mincount integer = ${count};
  test_md5_current text;
  test_md5_previous text;

BEGIN

${sourceString}

  -- test row count
  SELECT
    count(*) into test_count
  FROM
    fdt_${rndString};

  IF test_count < test_mincount THEN
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

  IF test_md5_current = test_md5_previous THEN
    raise exception 'no change found';
  END IF;


  -- run update
	TRUNCATE TABLE ${destination} RESTART IDENTITY;

  INSERT INTO ${destination}
    (
      -- insert local table rows here
    )
  SELECT
      -- insert matching foreign table rows here
  FROM
    fdt_${rndString};

  EXECUTE 'COMMENT ON TABLE ${destination} IS ' || quote_literal(test_md5_current);


  -- remove server(s) and foreign table(s)
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
