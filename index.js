const {Storage} = require('@google-cloud/storage');
const path =require('path');
const fs = require('fs-extra');
const os = require('os');
const sharp = require('sharp');
const getExif = require('exif-async');
const parseDMS = require('parse-dms');
const {Firestore} = require('@google-cloud/firestore');

exports.generateThumbData = async (file, context) => {

    //Hint
    const version = process.env.K_VERSION;
    console.log(`Running Cloud Function version ${version}`);

    await generateThumbnails(file, context);
}


// Entry point function
const generateThumbnails = async (file, context) => {

    const gcsFile = file;
    const storage = new Storage();
    const sourceBucket = storage.bucket(gcsFile.bucket);
    const thumbnailsBucket = storage.bucket('sp24-cit412-lluu-gj-thumbnails');
    const finalBucket = storage.bucket('sp24-cit412-lluu-gj-final');


    console.log(`File name: ${gcsFile.name}`);
    console.log(`Generation: ${gcsFile.generation}`);
    console.log(`Content type: ${gcsFile.contentType}`);

     // Reject images that are not jpeg or png 
    let fileExtension = '';
    let validFile = false;

    if (gcsFile.contentType === 'image/jpeg') {
        console.log('This is a JPG file');
        fileExtension = 'jpg';
        validFile = true;
    
      } else if (gcsFile.contentType === 'image/png'){
        console.log('This is a PNG file');
        fileExtension = 'png';
        validFile = true;
    
      } else {
        console.log('This is not a valid file');
      }

    if (validFile) {
    // Create a new filename for the 'final' version of the image file

    const finalFileName = `${gcsFile.generation}.${fileExtension}`

    // Create a working directory on the VM that runs our GCF to download the original file
    // The value of this variable will be something like 'tmp/thumbs'
    const workingDir = path.join(os.tmpdir(), 'thumb');

    // Create a variable that holds the path to the 'local' version of the file

    const tempFilePath = path.join(workingDir, finalFileName)

    // Wait until the working directory is ready
    await fs.ensureDir(workingDir);

    // Download the original file to the path on the 'local' VM
    await sourceBucket.file(gcsFile.name).download({
        destination: tempFilePath
    });

    //Exif right-here

    // const gpsData = 
    const gpsDecimal = await extractExif(tempFilePath);

    // const degCoords = getGPSCoordinates(gpsData);

    // Upload our local version of the file to the final images bucket
    await finalBucket.upload(tempFilePath);

    // Create a name for the thumbnail image
    const thumbName = `thumb@64_${finalFileName}`;

    // Create a path where we will store the thumbnail image locally
    const thumbPath = path.join(workingDir, thumbName);

    // Use the sharp library to generate the thumbnail image and save it to the thumbPath
    // Then upload the thumbnail to the thumbnailsBucket in cloud storage
    await sharp(tempFilePath)
    .resize(64)
    .withMetadata()
    .toFile(thumbPath)
    .then( async () => {
        await thumbnailsBucket.upload(thumbPath)
    });

    // Delete the temp working directory and its files from the GCF's VM
    await fs.remove(workingDir);

    //Photo Objects
      const photoData = {
        imageName: `${finalFileName}`,
        imageUrl: thumbnailsBucket.file(finalFileName).publicUrl(),
        lat:gpsDecimal.lat,
        lon:gpsDecimal.lon,
        thumbURL: finalBucket.file(thumbName).publicUrl()

    };
    await writeToFS(photoData);
    } 

    // DELETE the original file uploaded to the "Uploads" bucket
    await sourceBucket.file(gcsFile.name).delete();
    console.log(`Deleted uploaded file: ${gcsFile.name}`)
};

async function extractExif(tempfile) {
  let gpsObject = await readExifData(tempfile);
  console.log(gpsObject);
  let gpsDecimal = getGPSCoordinates(gpsObject);
  console.log(gpsDecimal);

  return gpsDecimal;
}


//Helper Function
async function readExifData(loadFile) {
  let exifData;
  try {
      exifData = await getExif(loadFile);
      // console.log(exifData);
      console.log(exifData);
      console.log(exifData.gps.GPSLatitude);
      return exifData.gps
  }catch(err){
      console.log(err);
      return null;
  }
}

function getGPSCoordinates (g){
  //PARSE DMS needs string in the format of:
  //51:30:0.5486N 0:7:34.4503W
  //DEG:MIN:SECDIRECTION DEG:MIN:SECDIRECTION 
  const latString = `${g.GPSLatitude[0]}:${g.GPSLatitude[1]}:${g.GPSLatitude[2]}${g.GPSLatitudeRef}`;
  const longString = `${g.GPSLongitude[0]}:${g.GPSLongitude[1]}:${g.GPSLongitude[2]}${g.GPSLongitudeRef}`;

  const degCoords = parseDMS(`${latString} ${longString}`);


return degCoords
}

async function writeToFS(dataObject) {
  const firestore = new Firestore ({
      projectId: "sp24-cit412-lluu-globaljags"
  });

  console.log(dataObject)


  //
  let collectionRef = firestore.collection('photo');
  let documentRef = await collectionRef.add(dataObject);

  console.log(`Document created: ${documentRef.id}`);

}