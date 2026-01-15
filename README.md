# GEO5019 - One DTM, DSM and Hillshade COG of the Netherlands

# Running the server
## 1. Copying the repository
The repository can be copied from https://github.com/fauer1-bit/GEO5019_COGS.git
Except for the folders **cogs** and **pmtiles**, all the other files that were previously in godzilla can be removed to avoid confusion

## 2. Serve PMTiles:
Serve the pmtiles directory, by default in port 5000. Activate CORS.
Currently, map.js opens pmtiles from the following paths:

`http://localhost:5000/hillshade_dtm.pmtiles` (line 18)

`http://localhost:5000/hillshade_dsm.pmtiles` (line 27)

If a different port is used to serve the pmtiles directory, update accordingly.

## 3. Run node.js:
Navigate to server/ and run the command `node server.js`




# Students

- Frederick Auer
- Juan Mezo Garcia
- Andika Hadi

### Link to project

<https://www.overleaf.com/project/693bfd9b8d59bc058d567b06>
