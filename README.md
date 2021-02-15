# NodeJS ETL tooling for Postgres/PostGIS

Mecklenburg County made this tool to make moving spatial data into Postgres easy to script and schedule. It does that by leveraging the extraordinary [ogr-fdw](https://github.com/pramsey/pgsql-ogr-fdw). Any praise should be flung in that direction. We just did a little wrapper plumbing.

## How it works

For each data layer you want to move across, create a [PL/pgSQL](https://www.postgresql.org/docs/current/plpgsql.html) `.sql` file in the `jobs` folder. There are several demo scripts in there for different connection types. Note that they won't *work* on your machine, as the target and sometimes source data may not exist. They're just to get you started.

The `PL/pgSQL` can do whatever you want. We set them up like this:

```sql
do
$$
DECLARE
	-- drop variables for testing in here

BEGIN
  -- create ogr_fdw server connection

  -- create foreign table

  -- run tests

  -- run update

  -- clean up the foreign server/table

  -- do anything else you need to do

END;
$$ LANGUAGE plpgsql;
```

The script runs as a transaction, so you shouldn't get left in a broken state if something goes wrong. For example, if you truncate the destination table and there's an error inserting new records, it will be as if the truncate never happened. The sky is the limit for what you can do in these update scripts - see the [PL/pgSQL docs](https://www.postgresql.org/docs/current/plpgsql.html) for details.

## Get started

`ogr_fdw` must be installed in the target Postgres database for any of this to work. It is available in most Linux installs and is available in the post-installation Postgres options on Windows.

```sql
CREATE EXTENSION ogr_fdw;
```

One you have the repo, first install the node packages.

```bash
npm install
```

Next rename the `.env-demo` file to `.env` and put in your server credentials. Craft some `.sql` jobs and put them in the `jobs` folder. There are some examples in the `jobs-demo` folder you can check out. You run your jobs with:

```bash
node index.js
```

If you only want to run one of your jobs, you can add the job name to the command to only execute it.

```bash
node index.js myjob.sql
```

You can generate a starter job template like this:

```bash
# node template.js <source table> <destination table> <minimum row count> <output job name>
node template.js source destination 200 my_job.sql
```

## Connecting to Foreign Databases

You can find examples on making connections to RDBMS and local folders on the [ogr-fdw](https://github.com/pramsey/pgsql-ogr-fdw) page, and the [GDAL](https://gdal.org/) docs are a good source of information as well.

The template creator makes an example Postgres connection.

```sql Postgres
CREATE SERVER IF NOT EXISTS fdw_server
	FOREIGN DATA WRAPPER ogr_fdw
	OPTIONS (datasource 'Pg:dbname=? user=? host=? password=?', format 'PostgreSQL' );
```

A Microsoft SQL Server connection would look something like this:

```sql MSSQL
CREATE SERVER fdw_mssql
  FOREIGN DATA WRAPPER ogr_fdw
  OPTIONS (
    datasource 'MSSQL:server=?;database=?;uid=?;pwd=?',
    format 'MSSQLSpatial' );
```

The ETL tool will serve GeoJSON or EsriJSON from a `/data` folder while the jobs are running using [Express](http://expressjs.com/). The Express server endpoint is `http://<etl-ip>:3000/data/<your-json-file>`. This can be a handy dumping place for data files from proprietary sources, like Esri's SDE. Express is using Node's file streaming and can handle quite large GeoJSON files. A database connection to the local GeoJSON file server looks like this:

```sql GeoJSON
CREATE SERVER IF NOT EXISTS fdw_etl_geojson
	FOREIGN DATA WRAPPER ogr_fdw
	OPTIONS (datasource 'GeoJSON:http://<ip address>:3000/data/tax_parcels.geojson', format 'GeoJSON' );
```

The layer name to use in this case is the name of the file.

```sql GeoJSON Layer
CREATE FOREIGN TABLE IF NOT EXISTS fdt_tax_parcels
	(
    pid varchar,
    geom Geometry(Geometry, 2264)
	) SERVER "fdw_etl_geojson" OPTIONS (layer 'tax_parcels');
```

You can use the Express GeoJSON server in stand-alone mode when developing your ETL scripts via:

```bash
node serve.js
```


## Tips and tricks

* Jobs are executed in series. You could change the loop in `index.js` to run them in parallel if you are in a hurry. You might run in to problems if two parallel jobs use the same foreign server or table name at the same time. Spoiler: I haven't tried that.
* The `lib/log.js` script logs things in two places - a file (`log.csv`), and, if it exists, a table in Postgres you can make (table create script in `lib/log.js`). You can comment out either of those if you don't want them. That would be a great place to send yourself an email if something terrible happened.
* In the example jobs, I add and remove the foreign server and table as part of the script. You could set those up on your server and leave them there permanently if you want. My thinking is if you wanted people to hit those tables live you wouldn't need an ETL job.
* If you are trying to pull data from a `https` source from a Docker image, make sure you have the `ca-certificates` package installed.
* Your Docker Postgres instance may have trouble with DNS resolution. If so, use the source's IP address instead.
* I had a hard time getting `ogr-fdw` to connect to MS SQL from a Docker container. I'm not sure if it's a Docker thing or a Linux thing. If you have similar problems, you may want to try [tds_fdw](https://github.com/tds-fdw/tds_fdw) for those connections.
